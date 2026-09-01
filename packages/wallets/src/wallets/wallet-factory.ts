import { WithLoggerContext } from "@crossmint/common-sdk-base";
import { WebAuthnP256 } from "ox";
import { walletsLogger } from "../logger";

import type {
    RecoverySignerConfig,
    ApiClient,
    CreateWalletParams,
    CreateWalletResponse,
    GetWalletSuccessResponse,
    RegisterSignerPasskeyParams,
    Signer as SignerResponse,
    RegisterSignerParams,
} from "../api";
import {
    DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE,
    InvalidRecoveryConfigError,
    MAX_RECOVERY_SIGNERS,
    RecoveryNotSupportedOnChainError,
    RecoverySignerLimitExceededError,
    WalletCreationError,
    WalletNotAvailableError,
    throwIfRecoverySignerApiError,
} from "../utils/errors";
import { type Chain, validateChainForEnvironment } from "../chains/chains";
import type {
    ExternalWalletRegistrationConfig,
    PasskeySignerConfig,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
} from "../signers/types";
import { Wallet } from "./wallet";
import type { RecoverySignerConfigFor, WalletArgsFor, WalletCreateArgs } from "./types";
import { toRecoverySignerList } from "../utils/recovery";
import { compareSignerConfigs, normalizeValueForComparison } from "../utils/signer-validation";
import { getSignerLocator } from "../utils/signer-locator";
import { deriveServerSignerDetails, deriveServerSignerCandidates } from "../signers/server";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";
import { createDeviceSigner } from "@/utils/device-signers";

const SIGNER_MISMATCH_ERROR =
    "When 'signers' is provided to a method that may fetch an existing wallet, each specified signer must exist in that wallet's configuration.";

type SmartWalletConfig = {
    /** @deprecated The API still returns the first admin signer here; `recovery` holds all of them. */
    adminSigner: RecoverySignerConfig | PasskeySignerConfig;
    recovery?: Array<RecoverySignerConfig | PasskeySignerConfig>;
    delegatedSigners?: SignerResponse[];
};

/** A recovery signer once passkey creation and server signer derivation have been resolved. */
type ResolvedRecoverySigner = RecoverySignerConfig | RegisterSignerPasskeyParams | { type: "server"; address: string };

/**
 * The recovery half of a wallet-creation request. The API rejects requests carrying both fields
 * (`RECOVERY_ADMIN_SIGNER_CONFLICT`), so a list goes under `recovery` while a single signer keeps
 * using the deprecated `adminSigner` field.
 */
type RecoveryRequestConfig = { adminSigner: ResolvedRecoverySigner } | { recovery: ResolvedRecoverySigner[] };

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    // Client-side
    public async getWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>>;
    // Server-side
    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>>;
    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.getWallet",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            if (typeof args[0] === "string") {
                const walletArgs = args[1] as WalletArgsFor<Chain> | undefined;
                return { walletLocator: args[0] as string, chain: walletArgs?.chain };
            }
            const walletArgs = args[0] as WalletArgsFor<Chain>;
            return { chain: walletArgs?.chain };
        },
    })
    public async getWallet<C extends Chain>(
        argsOrLocator: string | WalletArgsFor<C>,
        maybeArgs?: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        let walletLocator: string;
        let args: WalletArgsFor<C>;

        if (typeof argsOrLocator === "string") {
            if (!this.apiClient.isServerSide) {
                throw new WalletCreationError(
                    "getWallet with walletLocator is only available on the server side. Use getWallet(args) instead."
                );
            }
            if (maybeArgs == null) {
                throw new WalletCreationError(
                    "Wallet configuration is required when using walletLocator: https://docs.crossmint.com/sdk-reference/wallets/type-aliases/WalletArgsFor"
                );
            }
            walletLocator = argsOrLocator;
            args = maybeArgs;
        } else {
            if (this.apiClient.isServerSide) {
                throw new WalletCreationError(
                    "getWallet on server side requires a walletLocator parameter. Use getWallet(walletLocator, args) instead."
                );
            }
            args = argsOrLocator;
            walletLocator = this.getWalletLocator(args);
        }

        const validatedArgs = { ...args, chain: validateChainForEnvironment(args.chain, this.apiClient.environment) };

        walletsLogger.info("walletFactory.getWallet.start");

        const existingWallet = await this.apiClient.getWallet(walletLocator);
        if ("error" in existingWallet) {
            walletsLogger.warn("walletFactory.getWallet.notFound", {
                error: existingWallet.error,
            });
            throw new WalletNotAvailableError(JSON.stringify(existingWallet));
        }

        walletsLogger.info("walletFactory.getWallet.success", {
            address: existingWallet.address,
        });

        return await this.createWalletInstance(existingWallet, validatedArgs);
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.createWallet",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            const walletArgs = args[0] as WalletCreateArgs<Chain>;
            return { chain: walletArgs.chain };
        },
    })
    public async createWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
        const validatedArgs = { ...args, chain: validateChainForEnvironment(args.chain, this.apiClient.environment) };
        await validatedArgs.options?.callbacks?.onWalletCreationStart?.();
        walletsLogger.info("walletFactory.createWallet.start");

        if (!this.apiClient.isServerSide && validatedArgs.owner != null) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: "Owner field cannot be specified in client-side createWallet calls",
            });
            throw new WalletCreationError(
                "Owner field cannot be specified in client-side createWallet calls. Owner is determined from JWT authentication."
            );
        }

        // Inject a device signer as the default when key storage is available and the caller supplied none.
        // Some providers reject it at creation; createSmartWallet retries without it, gated on this same flag.
        const explicitSigners = validatedArgs.signers ?? [];
        const didAutoInjectDeviceSigner =
            validatedArgs.options?.deviceSignerKeyStorage != null && !explicitSigners.some((s) => s.type === "device");
        const signersToRegister = didAutoInjectDeviceSigner
            ? [...explicitSigners, { type: "device" } as SignerConfigForChain<C>]
            : explicitSigners;
        const builtSigners = await this.registerSigners(
            signersToRegister,
            validatedArgs.chain,
            validatedArgs.options?.deviceSignerKeyStorage
        );

        const recoverySigners = this.validatedRecoverySignerList(validatedArgs.recovery, validatedArgs.chain);
        const resolvedRecoverySigners: ResolvedRecoverySigner[] = [];
        // Sequential: resolving a passkey signer prompts the user, and browsers reject concurrent WebAuthn calls.
        for (const recoverySigner of recoverySigners) {
            resolvedRecoverySigners.push(await this.resolveRecoverySigner(recoverySigner, validatedArgs.chain));
        }
        const recoveryRequestConfig: RecoveryRequestConfig = Array.isArray(validatedArgs.recovery)
            ? { recovery: resolvedRecoverySigners }
            : { adminSigner: resolvedRecoverySigners[0] };

        const walletResponse = await this.createSmartWallet(
            validatedArgs,
            recoveryRequestConfig,
            builtSigners,
            didAutoInjectDeviceSigner
        );

        if ("error" in walletResponse) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: walletResponse.error,
            });
            throwIfRecoverySignerApiError(walletResponse);
            throw new WalletCreationError(JSON.stringify(walletResponse));
        }

        walletsLogger.info("walletFactory.createWallet.success", {
            address: walletResponse.address,
        });

        return await this.createWalletInstance(walletResponse, validatedArgs);
    }

    /** Creates the smart wallet, retrying once without the auto-injected device signer if the provider rejects it. */
    private async createSmartWallet<C extends Chain>(
        args: WalletCreateArgs<C>,
        recoveryRequestConfig: RecoveryRequestConfig,
        builtSigners: Array<{ signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }>,
        didAutoInjectDeviceSigner: boolean
    ): Promise<CreateWalletResponse> {
        const buildParams = (delegatedSigners: typeof builtSigners): CreateWalletParams =>
            ({
                type: "smart",
                chainType: this.getChainType(args.chain),
                config: {
                    ...recoveryRequestConfig,
                    ...(args.plugins ? { plugins: args.plugins } : {}),
                    ...(delegatedSigners != null ? { delegatedSigners } : {}),
                },
                owner: args.owner ?? undefined,
                alias: args.alias ?? undefined,
            }) as CreateWalletParams;

        const walletResponse = await this.apiClient.createWallet(buildParams(builtSigners));

        const rejectedDeviceSigner =
            didAutoInjectDeviceSigner &&
            "error" in walletResponse &&
            (walletResponse as { code?: string }).code === DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE;
        if (!rejectedDeviceSigner) {
            return walletResponse;
        }

        walletsLogger.info("walletFactory.createWallet.deviceSignerUnsupported.retryWithoutDeviceSigner", {
            chain: args.chain,
        });
        const signersWithoutDeviceSigner = builtSigners.filter((s) => !this.isBuiltDeviceSigner(s));
        return await this.apiClient.createWallet(buildParams(signersWithoutDeviceSigner));
    }

    /**
     * Normalizes the caller's recovery config into a list, rejecting locally what the API would reject
     * anyway so callers fail fast and without a round trip.
     */
    private validatedRecoverySignerList<C extends Chain>(
        recovery: WalletCreateArgs<C>["recovery"],
        chain: C
    ): Array<RecoverySignerConfigFor<C>> {
        const recoverySigners = toRecoverySignerList(recovery) as Array<RecoverySignerConfigFor<C>>;
        if (!Array.isArray(recovery)) {
            return recoverySigners;
        }
        if (chain !== "solana" && chain !== "stellar") {
            throw new RecoveryNotSupportedOnChainError(
                `Multiple recovery signers are not supported on ${chain} yet. Pass a single recovery signer.`
            );
        }
        if (recoverySigners.length === 0) {
            throw new InvalidRecoveryConfigError("At least one recovery signer is required");
        }
        if (recoverySigners.length > MAX_RECOVERY_SIGNERS) {
            throw new RecoverySignerLimitExceededError(
                `A wallet can have at most ${MAX_RECOVERY_SIGNERS} recovery signers, but ${recoverySigners.length} were provided`
            );
        }
        return recoverySigners;
    }

    /** Creates the passkey / derives the server signer address a recovery signer needs to be sent to the API. */
    private async resolveRecoverySigner<C extends Chain>(
        recovery: RecoverySignerConfigFor<C>,
        chain: C
    ): Promise<ResolvedRecoverySigner> {
        if (recovery.type === "passkey" && recovery.id == null) {
            return await this.createPasskeySigner(recovery as SignerConfigForChain<C>);
        }
        if (recovery.type === "server") {
            const { derivedAddress } = deriveServerSignerDetails(
                recovery,
                chain,
                this.apiClient.projectId,
                this.apiClient.environment
            );
            return { type: "server", address: derivedAddress };
        }
        return recovery as ResolvedRecoverySigner;
    }

    // Matches a device signer in object form. Callers only run this when didAutoInjectDeviceSigner is
    // true (no caller-supplied device signer), so the sole match is the one we injected.
    private isBuiltDeviceSigner(
        builtSigner: { signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }
    ): boolean {
        const signer = builtSigner.signer;
        return typeof signer === "object" && signer != null && signer.type === "device";
    }

    // `channel` (OTP delivery preference for phone signers) is a client-only field that the
    // wallet-creation API never persists or returns, so it's always sourced from the caller's config.
    private mergePhoneChannel<T extends { type: string }>(
        apiConfig: T,
        inputConfig?: { type: string; channel?: "sms" | "whatsapp" }
    ): T {
        if (apiConfig.type !== "phone" || inputConfig?.type !== "phone" || inputConfig.channel == null) {
            return apiConfig;
        }
        return { ...apiConfig, channel: inputConfig.channel };
    }

    private async createWalletInstance<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        this.validateExistingWalletConfig(walletResponse, args);

        // For server and external-wallet signers, use the user-provided recovery config to preserve
        // runtime data the API cannot store (server secret, external-wallet onSign callback).
        // Same for signers, if there is only one server or external-wallet signer, use the user-provided one.
        // For all other types (passkey, device, etc.), use the API response which contains the full
        // signer details (e.g. passkey credential ID).
        const createArgs = args as WalletCreateArgs<C>;
        const walletConfig = walletResponse.config as SmartWalletConfig;
        // `recovery` holds every admin signer; older responses (and wallets created with a single
        // signer) only carry the deprecated singular `adminSigner`.
        const apiRecoverySigners = (walletConfig.recovery ?? [walletConfig.adminSigner]) as Array<
            RecoverySignerConfigForChain<C>
        >;
        const recoverySigners = this.mergeRecoverySigners(
            apiRecoverySigners,
            toRecoverySignerList<C>(createArgs.recovery),
            args.chain
        );

        const apiDelegatedSigners = walletConfig.delegatedSigners;
        let signers = apiDelegatedSigners;
        if (
            signers != null &&
            signers.length === 1 &&
            (signers[0].type === "server" || signers[0].type === "external-wallet")
        ) {
            signers = createArgs.signers as SignerResponse[];
        } else if (signers != null) {
            // `channel` (OTP delivery preference for phone signers) is a client-only field that never
            // round-trips through the wallet-creation API response, so merge it back in from the caller's
            // config for any delegated phone signers.
            const inputSigners = createArgs.signers;
            signers = signers.map((s) =>
                this.mergePhoneChannel(
                    s,
                    inputSigners?.find(
                        (input) => input.type === "phone" && s.type === "phone" && getSignerLocator(input) === s.locator
                    )
                )
            ) as SignerResponse[];
        }

        // Preserve the API-sourced server signer recovery address so the wallet can identify
        // legacy derivations even when the user-provided config replaces the API one.
        const apiRecoveryServerSignerAddress = apiRecoverySigners
            .filter((s) => s.type === "server" && "address" in s && !("secret" in s))
            .map((s) => (s as { address: string }).address)[0];

        // Preserve the API-sourced server signer delegated addresses so the wallet can identify
        // legacy derivations even when the user-provided config replaces the API one.
        const apiDelegatedServerSignerAddresses = (apiDelegatedSigners ?? [])
            .filter((s) => s.type === "server" && "address" in s && !("secret" in s))
            .map((s) => (s as { address: string }).address);

        const wallet = new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                options: args.options,
                alias: args.alias,
                recovery: recoverySigners,
                apiRecoveryServerSignerAddress,
                apiDelegatedServerSignerAddresses,
                signers: (signers ?? []) as SignerConfigForChain<C>[],
            },
            this.apiClient
        );

        // Await signer initialization so that needsRecovery() returns the correct
        // value immediately after getWallet() / createWallet() resolves.
        await wallet.waitForInit();

        return wallet;
    }

    /**
     * Pairs each recovery signer returned by the API with the caller's config for the same signer, keeping the
     * caller's config for server and external-wallet signers (it carries the secret / onSign callback the
     * API cannot store) and the API's config otherwise (it carries e.g. the passkey credential ID).
     */
    private mergeRecoverySigners<C extends Chain>(
        apiRecoverySigners: Array<RecoverySignerConfigForChain<C>>,
        inputRecoverySigners: Array<RecoverySignerConfigForChain<C>>,
        chain: C
    ): Array<RecoverySignerConfigForChain<C>> {
        const unmatchedInputSigners = [...inputRecoverySigners];
        const pairedInputSigners = new Map<number, RecoverySignerConfigForChain<C>>();
        // Pair on signer identity first and only then on type alone, so that a server signer whose API-reported
        // address comes from a legacy derivation still keeps the caller's config (and its secret).
        const matchers = [
            (input: RecoverySignerConfigForChain<C>, api: RecoverySignerConfigForChain<C>) =>
                this.matchesRecoverySigner(input, api, chain),
            (input: RecoverySignerConfigForChain<C>, api: RecoverySignerConfigForChain<C>) => input.type === api.type,
        ];
        for (const matches of matchers) {
            apiRecoverySigners.forEach((apiRecoverySigner, index) => {
                if (pairedInputSigners.has(index)) {
                    return;
                }
                const inputIndex = unmatchedInputSigners.findIndex((input) => matches(input, apiRecoverySigner));
                if (inputIndex === -1) {
                    return;
                }
                pairedInputSigners.set(index, unmatchedInputSigners.splice(inputIndex, 1)[0]);
            });
        }

        return apiRecoverySigners.map((apiRecoverySigner, index) => {
            const inputRecoverySigner = pairedInputSigners.get(index);
            if (inputRecoverySigner == null) {
                return apiRecoverySigner;
            }
            if (inputRecoverySigner.type === "server" || inputRecoverySigner.type === "external-wallet") {
                return inputRecoverySigner;
            }
            return this.mergePhoneChannel(apiRecoverySigner, inputRecoverySigner);
        });
    }

    /**
     * Whether a caller-provided recovery signer config denotes the same signer as one the API returned.
     * Wallets can have several recovery signers of the same type, so the identifying field is compared too:
     * for server signers that means deriving the address the caller's secret maps to.
     */
    private matchesRecoverySigner<C extends Chain>(
        inputRecoverySigner: RecoverySignerConfigForChain<C>,
        apiRecoverySigner: RecoverySignerConfig | PasskeySignerConfig | RecoverySignerConfigForChain<C>,
        chain: C
    ): boolean {
        if (inputRecoverySigner.type !== apiRecoverySigner.type) {
            return false;
        }
        if (inputRecoverySigner.type === "email" && "email" in apiRecoverySigner) {
            return (
                normalizeValueForComparison(inputRecoverySigner.email) ===
                normalizeValueForComparison(apiRecoverySigner.email)
            );
        }
        if (inputRecoverySigner.type === "phone" && "phone" in apiRecoverySigner) {
            return inputRecoverySigner.phone === apiRecoverySigner.phone;
        }
        if (inputRecoverySigner.type === "external-wallet" && "address" in apiRecoverySigner) {
            return inputRecoverySigner.address === apiRecoverySigner.address;
        }
        if (inputRecoverySigner.type === "server" && "address" in apiRecoverySigner) {
            if (!("secret" in inputRecoverySigner)) {
                return inputRecoverySigner.address === apiRecoverySigner.address;
            }
            const { primary, legacy } = deriveServerSignerCandidates(
                inputRecoverySigner,
                chain,
                this.apiClient.projectId,
                this.apiClient.environment
            );
            return (
                primary.derivedAddress === apiRecoverySigner.address ||
                legacy?.derivedAddress === apiRecoverySigner.address
            );
        }
        return true;
    }

    private getWalletLocator<C extends Chain>(args: WalletArgsFor<C>): string {
        return `me:${this.getChainType(args.chain)}:smart` + (args.alias != null ? `:alias:${args.alias}` : "");
    }

    private async createPasskeySigner<C extends Chain>(
        signer: SignerConfigForChain<C>
    ): Promise<RegisterSignerPasskeyParams> {
        if (signer.type !== "passkey") {
            throw new Error("Signer is not a passkey");
        }
        const passkeyName = signer.name ?? `Crossmint Wallet ${Date.now()}`;
        const passkeyCredential = signer.onCreatePasskey
            ? await signer.onCreatePasskey(passkeyName)
            : await WebAuthnP256.createCredential({ name: passkeyName });
        return {
            type: "passkey",
            id: passkeyCredential.id,
            name: passkeyName,
            publicKey: {
                x: passkeyCredential.publicKey.x.toString(),
                y: passkeyCredential.publicKey.y.toString(),
            },
        };
    }

    private validateExistingWalletConfig<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        args: WalletArgsFor<C> | WalletCreateArgs<C>
    ): void {
        if (
            args.owner != null &&
            existingWallet.owner != null &&
            normalizeValueForComparison(args.owner) !== normalizeValueForComparison(existingWallet.owner)
        ) {
            throw new WalletCreationError("Wallet owner does not match existing wallet's linked user");
        }

        if (
            (args.chain === "solana" && existingWallet.chainType !== "solana") ||
            (args.chain !== "solana" && existingWallet.chainType === "solana") ||
            (args.chain === "stellar" && existingWallet.chainType !== "stellar") ||
            (args.chain !== "stellar" && existingWallet.chainType === "stellar")
        ) {
            throw new WalletCreationError(
                `Wallet chain does not match existing wallet's chain. You must use chain: ${existingWallet.chainType}.`
            );
        }

        if (existingWallet.type !== "smart") {
            return;
        }

        const createArgs = args as WalletCreateArgs<C>;
        if (createArgs.recovery != null || createArgs.signers != null) {
            const config = existingWallet.config as SmartWalletConfig;
            const existingWalletSigners = config?.recovery ?? (config?.adminSigner != null ? [config.adminSigner] : []);

            const unmatchedExistingSigners = [...existingWalletSigners] as Array<RecoverySignerConfigForChain<C>>;
            for (const inputRecoverySigner of toRecoverySignerList<C>(createArgs.recovery)) {
                if (existingWalletSigners.length === 0) {
                    break;
                }
                const matchIndex = unmatchedExistingSigners.findIndex((existingWalletSigner) =>
                    this.matchesRecoverySigner(inputRecoverySigner, existingWalletSigner, args.chain)
                );
                const existingWalletSigner =
                    matchIndex === -1
                        ? unmatchedExistingSigners.find((s) => s.type === inputRecoverySigner.type)
                        : unmatchedExistingSigners[matchIndex];
                if (existingWalletSigner == null) {
                    throw new WalletCreationError(
                        "The wallet recovery signer type does not match the existing wallet's recovery signer type"
                    );
                }
                compareSignerConfigs(inputRecoverySigner, existingWalletSigner);
                if (matchIndex !== -1) {
                    unmatchedExistingSigners.splice(matchIndex, 1);
                }
            }

            const inputSigners = createArgs.signers;
            if (inputSigners != null) {
                this.validateSigners(existingWallet, inputSigners, args.chain);
            }
        }
    }

    private validateSigners<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        inputSigners: Array<SignerConfigForChain<C> | ExternalWalletRegistrationConfig>,
        chain: C
    ): void {
        const config = existingWallet.config as SmartWalletConfig;
        const existingSigners = config?.delegatedSigners;

        // If no signers specified in input, no validation needed
        if (inputSigners.length === 0) {
            return;
        }

        // If input has signers but wallet has none, that's an error
        if (existingSigners == null || existingSigners.length === 0) {
            throw new WalletCreationError(
                `${inputSigners.length} signer(s) specified, but wallet "${existingWallet.address}" has no signers. ${SIGNER_MISMATCH_ERROR}`
            );
        }

        for (const inputSigner of inputSigners) {
            const matchingExistingSigner = existingSigners.find((existingSigner) => {
                if (this.isMatchingPasskeySigner(inputSigner, existingSigner, config)) {
                    return true;
                }
                if (existingSigner.type === "device" && inputSigner.type === "device") {
                    return true;
                }
                if (inputSigner.type === "server") {
                    const { primary, legacy } = deriveServerSignerCandidates(
                        inputSigner,
                        chain,
                        this.apiClient.projectId,
                        this.apiClient.environment
                    );
                    return (
                        existingSigner.locator === `server:${primary.derivedAddress}` ||
                        (legacy != null && existingSigner.locator === `server:${legacy.derivedAddress}`)
                    );
                }
                return existingSigner.locator === getSignerLocator(inputSigner);
            });

            if (matchingExistingSigner == null) {
                const walletSignersList = existingSigners.map((s) => s.locator).join(", ");
                throw new WalletCreationError(
                    `Signer '${inputSigner.type}' does not exist in wallet "${existingWallet.address}". Available signers: ${walletSignersList}. ${SIGNER_MISMATCH_ERROR}`
                );
            }

            compareSignerConfigs(inputSigner, matchingExistingSigner);
        }
    }

    /*
    Checks if the input signer is a matching passkey signer to the existing signer.
    If the existing wallet has only one passkey, the input signer can be a passkey signer without an ID.
    If the existing wallet has multiple passkeys, the input signer must be a passkey signer with an ID.
    */
    private isMatchingPasskeySigner<C extends Chain>(
        inputSigner: SignerConfigForChain<C> | ExternalWalletRegistrationConfig,
        existingSigner: SmartWalletConfig["adminSigner"] | SignerResponse,
        walletConfig: SmartWalletConfig
    ): boolean {
        const numberOfPasskeySigners =
            (walletConfig.delegatedSigners?.filter((s) => s.type === "passkey").length ?? 0) +
            (walletConfig.adminSigner.type === "passkey" ? 1 : 0);
        if (inputSigner.type === "passkey") {
            if (inputSigner.id == null && numberOfPasskeySigners === 1) {
                return existingSigner.type === "passkey";
            }
            if (inputSigner.id == null && numberOfPasskeySigners > 1) {
                throw new WalletCreationError(
                    "When creating a wallet with multiple passkeys, you must provide the passkey ID for each passkey."
                );
            }
        }
        return false;
    }

    private async registerSigners<C extends Chain>(
        signersList?: Array<SignerConfigForChain<C> | ExternalWalletRegistrationConfig>,
        chain?: C,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ): Promise<Array<{ signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }>> {
        return await Promise.all(
            signersList?.map(
                async (
                    signer
                ): Promise<{ signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }> => {
                    if (signer.type === "passkey") {
                        if (signer.id == null) {
                            return { signer: await this.createPasskeySigner(signer) };
                        }
                        return { signer };
                    }
                    if (signer.type === "device") {
                        // If the device signer already has a locator or public key (e.g., created via createDeviceSigner helper), use it directly
                        if (signer.publicKey != null) {
                            return {
                                signer: {
                                    type: "device" as const,
                                    publicKey: signer.publicKey,
                                    name: signer.name,
                                },
                            };
                        }
                        if (signer.locator != null) {
                            return { signer: signer.locator };
                        }
                        if (deviceSignerKeyStorage == null) {
                            throw new WalletCreationError("Device signer key storage is required for device signers");
                        }
                        const deviceSigner = await createDeviceSigner(deviceSignerKeyStorage);
                        return {
                            signer: {
                                type: "device" as const,
                                publicKey: deviceSigner.publicKey,
                                name: deviceSigner.name,
                            },
                        };
                    }
                    if (signer.type === "server" && chain != null) {
                        const { derivedAddress } = deriveServerSignerDetails(
                            signer,
                            chain,
                            this.apiClient.projectId,
                            this.apiClient.environment
                        );
                        return { signer: `server:${derivedAddress}` };
                    }
                    return { signer: getSignerLocator(signer) as string };
                }
            ) ?? []
        );
    }

    private getChainType(chain: Chain): "solana" | "evm" | "stellar" {
        if (chain === "solana") {
            return "solana";
        }
        if (chain === "stellar") {
            return "stellar";
        }
        return "evm";
    }
}
