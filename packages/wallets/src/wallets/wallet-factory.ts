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
import { DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE, WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import { type Chain, validateChainForEnvironment } from "../chains/chains";
import type {
    DeviceSignerConfig,
    ExternalWalletRegistrationConfig,
    PasskeySignerConfig,
    QuorumMemberConfigForChain,
    QuorumRecoveryConfig,
    RecoveryConfigForChain,
    RecoverySignerConfigForChain,
    SignerConfigForChain,
} from "../signers/types";
import { isQuorumRecovery } from "../signers/types";
import { Wallet } from "./wallet";
import type { WalletArgsFor, WalletCreateArgs } from "./types";
import { compareSignerConfigs, normalizeEmail, normalizeValueForComparison } from "../utils/signer-validation";
import { getSignerLocator } from "../utils/signer-locator";
import { deriveServerSignerDetails, deriveServerSignerCandidates } from "../signers/server";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";
import { createDeviceSigner } from "@/utils/device-signers";

const SIGNER_MISMATCH_ERROR =
    "When 'signers' is provided to a method that may fetch an existing wallet, each specified signer must exist in that wallet's configuration.";

type SmartWalletConfig = {
    adminSigner: RecoverySignerConfig | PasskeySignerConfig;
    delegatedSigners?: SignerResponse[];
};

// The response DTO does not model a quorum admin signer yet; at runtime the API returns it
// under `config.adminSigner` with `type: "quorum"`, so it is read through this shape.
type ExistingQuorumAdminSigner = {
    type: "quorum";
    threshold?: number;
    signers: Array<Record<string, unknown> & { type: string }>;
};

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

        const recoveryConfig = this.normalizeRecovery(validatedArgs.recovery);
        let adminConfig: Record<string, unknown>;
        if (isQuorumRecovery(recoveryConfig)) {
            const quorumSigners = await Promise.all(
                recoveryConfig.methods.map((member) => this.prepareAdminSigner(member, validatedArgs.chain))
            );
            adminConfig = {
                // Quorum admins are sent on the `recovery` wire property; its member array is named `signers`.
                recovery: {
                    type: "quorum",
                    ...(recoveryConfig.threshold != null ? { threshold: recoveryConfig.threshold } : {}),
                    signers: quorumSigners,
                },
            };
        } else {
            adminConfig = { adminSigner: await this.prepareAdminSigner(recoveryConfig, validatedArgs.chain) };
        }

        const walletResponse = await this.createSmartWallet(
            validatedArgs,
            adminConfig,
            builtSigners,
            didAutoInjectDeviceSigner
        );

        if ("error" in walletResponse) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: walletResponse.error,
            });
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
        adminConfig: Record<string, unknown>,
        builtSigners: Array<{ signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }>,
        didAutoInjectDeviceSigner: boolean
    ): Promise<CreateWalletResponse> {
        const buildParams = (delegatedSigners: typeof builtSigners): CreateWalletParams =>
            ({
                type: "smart",
                chainType: this.getChainType(args.chain),
                config: {
                    ...adminConfig,
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

    // Matches a device signer in object form. Callers only run this when didAutoInjectDeviceSigner is
    // true (no caller-supplied device signer), so the sole match is the one we injected.
    private isBuiltDeviceSigner(
        builtSigner: { signer: string } | RegisterSignerParams | { signer: PasskeySignerConfig }
    ): boolean {
        const signer = builtSigner.signer;
        return typeof signer === "object" && signer != null && signer.type === "device";
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
        const apiRecovery = (walletResponse.config as SmartWalletConfig).adminSigner as RecoverySignerConfigForChain<C>;
        const recovery =
            createArgs.recovery?.type === "server" || createArgs.recovery?.type === "external-wallet"
                ? createArgs.recovery
                : apiRecovery;

        const apiDelegatedSigners = (walletResponse.config as SmartWalletConfig).delegatedSigners;
        let signers = apiDelegatedSigners;
        if (
            signers != null &&
            signers.length === 1 &&
            (signers[0].type === "server" || signers[0].type === "external-wallet")
        ) {
            signers = createArgs.signers as SignerResponse[];
        }

        // Preserve the API-sourced server signer recovery address so the wallet can identify
        // legacy derivations even when the user-provided config replaces the API one.
        const apiRecoveryServerSignerAddress =
            apiRecovery.type === "server" && "address" in apiRecovery && !("secret" in apiRecovery)
                ? (apiRecovery as { address: string }).address
                : undefined;

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
                recovery,
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

    private getWalletLocator<C extends Chain>(args: WalletArgsFor<C>): string {
        return `me:${this.getChainType(args.chain)}:smart` + (args.alias != null ? `:alias:${args.alias}` : "");
    }

    /** Runs the per-type prep an admin signer needs before it can be sent on the wire. */
    private async prepareAdminSigner<C extends Chain>(
        signer: Exclude<SignerConfigForChain<C>, DeviceSignerConfig> | QuorumMemberConfigForChain<C>,
        chain: C
    ): Promise<unknown> {
        if (signer.type === "passkey" && signer.id == null) {
            return await this.createPasskeySigner(signer);
        }
        if (signer.type === "server") {
            const { derivedAddress } = deriveServerSignerDetails(
                signer,
                chain,
                this.apiClient.projectId,
                this.apiClient.environment
            );
            return { type: "server", address: derivedAddress };
        }
        return signer;
    }

    /**
     * Validates a quorum recovery config and collapses a single-method quorum to a plain
     * single admin signer. Non-quorum configs pass through unchanged.
     */
    private normalizeRecovery<C extends Chain>(recovery: RecoveryConfigForChain<C>): RecoveryConfigForChain<C> {
        if (!isQuorumRecovery(recovery)) {
            return recovery;
        }
        const { threshold, methods } = recovery;
        if (methods.length === 0) {
            throw new WalletCreationError("Quorum recovery requires at least one method");
        }
        if (threshold != null && (!Number.isInteger(threshold) || threshold < 1 || threshold > methods.length)) {
            throw new WalletCreationError(
                `Quorum threshold must be an integer between 1 and the number of methods (${methods.length})`
            );
        }
        if (methods.length === 1) {
            // Quorum members are a subset of valid single admin signers; TS cannot relate the
            // two deferred conditional types for a generic chain, hence the cast.
            return methods[0] as RecoveryConfigForChain<C>;
        }
        return recovery;
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
            const existingWalletSigner = config?.adminSigner;

            if (createArgs.recovery != null && existingWalletSigner != null) {
                const recoveryConfig = this.normalizeRecovery(createArgs.recovery);
                const existingIsQuorum = (existingWalletSigner as { type?: string }).type === "quorum";
                if (isQuorumRecovery(recoveryConfig) !== existingIsQuorum) {
                    throw new WalletCreationError(
                        "The wallet recovery signer type does not match the existing wallet's recovery signer type"
                    );
                }
                if (isQuorumRecovery(recoveryConfig)) {
                    this.validateQuorumRecovery(
                        recoveryConfig,
                        existingWalletSigner as unknown as ExistingQuorumAdminSigner,
                        args.chain
                    );
                } else {
                    if (recoveryConfig.type !== existingWalletSigner.type) {
                        throw new WalletCreationError(
                            "The wallet recovery signer type does not match the existing wallet's recovery signer type"
                        );
                    }
                    compareSignerConfigs(recoveryConfig, existingWalletSigner);
                }
            }

            const inputSigners = createArgs.signers;
            if (inputSigners != null) {
                this.validateSigners(existingWallet, inputSigners, args.chain);
            }
        }
    }

    /**
     * Compares a quorum recovery config against an existing wallet's quorum admin signer.
     * The member set comparison is order-insensitive: each method must match a distinct
     * existing member, regardless of ordering (the quorum locator is a sorted-content hash).
     */
    private validateQuorumRecovery<C extends Chain>(
        recovery: QuorumRecoveryConfig<C>,
        existing: ExistingQuorumAdminSigner,
        chain: C
    ): void {
        const newThreshold = recovery.threshold ?? 1;
        const existingThreshold = existing.threshold ?? 1;
        if (newThreshold !== existingThreshold) {
            throw new WalletCreationError(
                `Quorum recovery threshold mismatch - expected "${existingThreshold}" from existing wallet but found "${newThreshold}"`
            );
        }

        const existingMembers = existing.signers ?? [];
        if (recovery.methods.length !== existingMembers.length) {
            throw new WalletCreationError(
                `Quorum recovery member count mismatch - expected "${existingMembers.length}" from existing wallet but found "${recovery.methods.length}"`
            );
        }

        const unmatched = [...existingMembers];
        for (const method of recovery.methods) {
            const matchIndex = unmatched.findIndex((candidate) =>
                this.isMatchingQuorumMember(method, candidate, chain)
            );
            if (matchIndex === -1) {
                throw new WalletCreationError(
                    `Quorum recovery member '${method.type}' does not match any member of the existing wallet's quorum recovery`
                );
            }
            const [matchedMember] = unmatched.splice(matchIndex, 1);
            compareSignerConfigs(method as Record<string, unknown>, matchedMember);
        }
    }

    private isMatchingQuorumMember<C extends Chain>(
        method: QuorumMemberConfigForChain<C>,
        candidate: Record<string, unknown> & { type: string },
        chain: C
    ): boolean {
        if (method.type !== candidate.type) {
            return false;
        }
        if (method.type === "server") {
            // User-supplied server members carry a secret; the API returns the derived address.
            const { primary, legacy } = deriveServerSignerCandidates(
                method,
                chain,
                this.apiClient.projectId,
                this.apiClient.environment
            );
            return (
                candidate.address === primary.derivedAddress ||
                (legacy != null && candidate.address === legacy.derivedAddress)
            );
        }
        if (method.type === "passkey") {
            if (method.id != null) {
                return candidate.id === method.id;
            }
            if (method.name != null) {
                return candidate.name === method.name;
            }
            return true; // field-level checks follow via compareSignerConfigs
        }
        if (method.type === "email") {
            return (
                method.email == null || normalizeEmail(method.email) === normalizeEmail(String(candidate.email ?? ""))
            );
        }
        if (method.type === "phone") {
            return method.phone == null || method.phone === candidate.phone;
        }
        return method.address === candidate.address; // external-wallet
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
