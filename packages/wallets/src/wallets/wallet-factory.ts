import { WithLoggerContext, APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { WebAuthnP256 } from "ox";
import { walletsLogger } from "../logger";

import type {
    AdminSignerConfig,
    ApiClient,
    CreateWalletParams,
    GetWalletSuccessResponse,
    RegisterSignerPasskeyParams,
    DelegatedSigner as DelegatedSignerResponse,
    RegisterSignerParams,
} from "../api";
import { InvalidEnvironmentError, WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import {
    type Chain,
    type EVMSmartWalletChain,
    isTestnetChain,
    isMainnetChain,
    mainnetToTestnet,
} from "../chains/chains";
import type {
    ApiKeyInternalSignerConfig,
    DeviceInternalSignerConfig,
    DeviceSignerConfig,
    CreatedDeviceSigner,
    EmailInternalSignerConfig,
    EmailSignerConfig,
    InternalSignerConfig,
    PasskeyInternalSignerConfig,
    PasskeySignerConfig,
    PhoneInternalSignerConfig,
    PhoneSignerConfig,
    SignerConfigForChain,
} from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { DelegatedSigner, WalletArgsFor, WalletCreateArgs, WalletOptions } from "./types";
import { compareSignerConfigs, normalizeValueForComparison } from "../utils/signer-validation";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";

const DELEGATED_SIGNER_MISMATCH_ERROR =
    "When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.";

type SmartWalletConfig = {
    adminSigner: AdminSignerConfig | PasskeySignerConfig;
    delegatedSigners?: DelegatedSignerResponse[];
    deviceSignerConfig?: {
        biometricPolicy?: string;
        expirationTime?: number;
    };
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
                return { walletLocator: args[0] as string, args: args[1] as WalletArgsFor<Chain> };
            }
            return { args: args[0] as WalletArgsFor<Chain> };
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
                    "getWallet with walletLocator is not supported on client side, use getWallet(args) instead"
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
            walletLocator = `me:${this.getChainType(args.chain)}:smart`;
        }

        args = { ...args, chain: this.validateChainEnvironment(args.chain) };

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

        return await this.createWalletInstanceFromGetArgs(existingWallet, args);
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.createWallet",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            const walletArgs = args[0] as WalletCreateArgs<Chain>;
            return { chain: walletArgs.chain, signerType: walletArgs.signer?.type ?? "none" };
        },
    })
    public async createWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
        args = { ...args, chain: this.validateChainEnvironment(args.chain) };

        // Client-side: if wallet already exists, return it (idempotent, safe for React dev mode double-runs)
        if (!this.apiClient.isServerSide) {
            if (args.owner != null) {
                throw new WalletCreationError(
                    "Owner field cannot be specified in client-side createWallet calls. Owner is determined from JWT authentication."
                );
            }
            const locator = this.getCreateWalletLocator<C>(args);
            const existingWallet = await this.apiClient.getWallet(locator);
            if (existingWallet != null && !("error" in existingWallet)) {
                walletsLogger.info("walletFactory.createWallet.existing", {
                    address: existingWallet.address,
                });
                this.validateExistingWalletConfig(existingWallet, args);
                return await this.createWalletInstanceFromCreateArgs(existingWallet, args);
            }
        }

        await args.options?.experimental_callbacks?.onWalletCreationStart?.();
        walletsLogger.info("walletFactory.createWallet.start");

        let adminSignerConfig = args.adminSigner ?? (args.signer as typeof args.adminSigner);
        if (adminSignerConfig == null) {
            throw new WalletCreationError("Either adminSigner or signer must be provided when creating a wallet");
        }
        if ((adminSignerConfig as { type: string }).type === "device") {
            throw new WalletCreationError("Device signer cannot be used as admin signer");
        }
        const delegatedSigners = await this.buildDelegatedSigners(args);
        const tempArgs = { chain: args.chain, signer: adminSignerConfig } as WalletArgsFor<C>;
        this.mutateSignerFromCustomAuth(tempArgs, true);
        adminSignerConfig = tempArgs.signer as typeof adminSignerConfig;
        const adminSigner =
            adminSignerConfig.type === "passkey" && adminSignerConfig.id == null
                ? await this.createPasskeySigner(adminSignerConfig)
                : adminSignerConfig;

        // Extract biometric policy from device signers to send at wallet config level
        const deviceSignerConfig = this.extractDeviceSignerConfig(args);

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(args.chain),
            config: {
                adminSigner,
                ...(args?.plugins ? { plugins: args.plugins } : {}),
                ...(delegatedSigners != null ? { delegatedSigners } : {}),
                ...(deviceSignerConfig != null ? { deviceSignerConfig } : {}),
            },
            owner: args.owner ?? undefined,
            alias: args.alias ?? undefined,
        } as CreateWalletParams);

        if ("error" in walletResponse) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: walletResponse.error,
            });
            throw new WalletCreationError(JSON.stringify(walletResponse));
        }

        await this.saveDeviceSignerKeyIfNeeded(
            walletResponse.address,
            delegatedSigners,
            args.options?.deviceSignerKeyStorage
        );

        walletsLogger.info("walletFactory.createWallet.success", {
            address: walletResponse.address,
        });

        return await this.createWalletInstanceFromCreateArgs(walletResponse, args);
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.assembleSigner",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            const walletArgs = args[0] as WalletArgsFor<Chain>;
            return { chain: walletArgs.chain, signer: args[1] };
        },
    })
    public async assembleSigner<C extends Chain>(
        args: WalletArgsFor<C>,
        signerConfig: SignerConfigForChain<C>,
        options?: WalletOptions
    ) {
        const locator = this.getWalletLocator<C>(args);

        const existingWallet = await this.apiClient.getWallet(locator);
        if ("error" in existingWallet) {
            throw new WalletNotAvailableError(JSON.stringify(existingWallet));
        }

        const internalSignerConfig = await this.toInternalSignerConfig(existingWallet, signerConfig, options);

        return assembleSigner(args.chain, internalSignerConfig, options?.deviceSignerKeyStorage);
    }

    private async saveDeviceSignerKeyIfNeeded(
        address: string,
        delegatedSigners: Awaited<ReturnType<typeof this.buildDelegatedSigners>>,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ) {
        const deviceSigner = delegatedSigners.find(
            (delegatedSigner): delegatedSigner is DelegatedSigner =>
                typeof delegatedSigner.signer === "string" && delegatedSigner.signer.startsWith("device:")
        );
        if (deviceSigner && deviceSignerKeyStorage == null) {
            throw new WalletCreationError("Device signer key storage is required for device signers");
        }
        if (deviceSigner && deviceSignerKeyStorage) {
            await deviceSignerKeyStorage.mapAddressToKey(address, deviceSigner.signer.split(":")[1]);
        }
    }

    /**
     * Build a Wallet instance from getWallet args (signer is required in WalletArgsFor).
     */
    private async createWalletInstanceFromGetArgs<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        this.validateExistingWalletConfig(walletResponse, args);
        const signerConfig = await this.toInternalSignerConfig(walletResponse, args.signer, args.options);
        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                signer: assembleSigner(args.chain, signerConfig, args.options?.deviceSignerKeyStorage),
                options: args.options,
                alias: args.alias,
                adminSigner: (walletResponse.config as SmartWalletConfig).adminSigner as SignerConfigForChain<C>,
            },
            this.apiClient
        );
    }

    /**
     * Build a Wallet instance from createWallet args (signer is optional).
     * If no signer provided, returns a read-only wallet.
     */
    private async createWalletInstanceFromCreateArgs<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletCreateArgs<C>
    ): Promise<Wallet<C>> {
        const signer =
            args.signer != null
                ? assembleSigner(
                      args.chain,
                      await this.toInternalSignerConfig(walletResponse, args.signer, args.options),
                      args.options?.deviceSignerKeyStorage
                  )
                : undefined;

        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                signer,
                options: args.options,
                alias: args.alias,
                adminSigner: (walletResponse.config as SmartWalletConfig).adminSigner as SignerConfigForChain<C>,
            },
            this.apiClient
        );
    }

    private async toInternalSignerConfig<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        signerArgs: SignerConfigForChain<C>,
        options?: WalletOptions
    ): Promise<InternalSignerConfig<C>> {
        if (
            !(
                walletResponse.chainType === "evm" ||
                walletResponse.chainType === "solana" ||
                walletResponse.chainType === "stellar"
            )
        ) {
            throw new WalletCreationError(`Wallet type ${walletResponse.chainType} is not supported`);
        }

        if (signerArgs == null && walletResponse.config?.adminSigner == null) {
            throw new WalletCreationError("Signer is required to create a wallet");
        }

        switch (signerArgs.type) {
            case "api-key": {
                return {
                    type: "api-key",
                    locator: this.getSignerLocator(signerArgs),
                    address: walletResponse.address,
                } as ApiKeyInternalSignerConfig;
            }

            case "external-wallet": {
                const walletSigner = this.getWalletSigner(walletResponse, this.getSignerLocator(signerArgs));

                return { ...walletSigner, ...signerArgs } as InternalSignerConfig<C>;
            }
            case "passkey": {
                const walletSigner = this.getWalletSigner(
                    walletResponse,
                    this.getSignerLocator(signerArgs)
                ) as PasskeySignerConfig;

                return {
                    type: "passkey",
                    id: walletSigner.id,
                    name: walletSigner.name,
                    locator: walletSigner.locator,
                    onCreatePasskey: signerArgs.onCreatePasskey,
                    onSignWithPasskey: signerArgs.onSignWithPasskey,
                } as PasskeyInternalSignerConfig;
            }
            case "email": {
                const walletSigner = this.getWalletSigner(
                    walletResponse,
                    this.getSignerLocator(signerArgs)
                ) as EmailSignerConfig;

                return {
                    type: "email",
                    email: walletSigner.email,
                    locator: "locator" in walletSigner ? walletSigner.locator : this.getSignerLocator(signerArgs),
                    address: "address" in walletSigner ? walletSigner.address : walletResponse.address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                } as EmailInternalSignerConfig;
            }
            case "device": {
                if (options?.deviceSignerKeyStorage == null) {
                    throw new WalletCreationError("Device signer key storage is required for device signers");
                }

                // Read biometric policy from wallet config level (not from signer args)
                const walletConfig = walletResponse.config as SmartWalletConfig;
                const biometricPolicy =
                    (walletConfig.deviceSignerConfig?.biometricPolicy as
                        | DeviceSignerConfig["biometricPolicy"]
                        | undefined) ??
                    signerArgs.biometricPolicy ??
                    "none";
                const biometricExpirationTime =
                    walletConfig.deviceSignerConfig?.expirationTime ??
                    (signerArgs.biometricPolicy === "session" ? signerArgs.biometricExpirationTime : undefined);

                const deviceSigner = await options.deviceSignerKeyStorage.getKey(walletResponse.address);
                if (!deviceSigner) {
                    return {
                        type: "device",
                        address: walletResponse.address,
                        biometricPolicy,
                        biometricExpirationTime: biometricPolicy === "session" ? biometricExpirationTime : undefined,
                    };
                }
                return {
                    type: "device",
                    locator: `device:${deviceSigner}`,
                    address: walletResponse.address,
                } as DeviceInternalSignerConfig;
            }

            case "phone": {
                const walletSigner = this.getWalletSigner(
                    walletResponse,
                    this.getSignerLocator(signerArgs)
                ) as PhoneSignerConfig;

                return {
                    type: "phone",
                    phone: walletSigner.phone,
                    locator: "locator" in walletSigner ? walletSigner.locator : this.getSignerLocator(signerArgs),
                    address: "address" in walletSigner ? walletSigner.address : walletResponse.address,
                    crossmint: this.apiClient.crossmint,
                    onAuthRequired: signerArgs.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                } as PhoneInternalSignerConfig;
            }

            default:
                throw new Error("Invalid signer type");
        }
    }

    private getWalletSigner(
        wallet: GetWalletSuccessResponse,
        signerLocator: string
    ): AdminSignerConfig | DelegatedSignerResponse | PasskeySignerConfig {
        const config = wallet.config as SmartWalletConfig;
        const adminSigner = config?.adminSigner;
        const delegatedSigners = config?.delegatedSigners || [];

        const signers = [adminSigner, ...delegatedSigners];
        const walletSigner = signers.find((signer) => {
            if (signerLocator === "passkey") {
                return signer.type === "passkey";
            }
            if ("locator" in signer) {
                return signer.locator === signerLocator;
            }
        });
        if (walletSigner != null) {
            return walletSigner;
        }
        throw new WalletCreationError(`${signerLocator} signer does not match the wallet's signer type`);
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

    private async createDeviceSigner(
        signer: DeviceSignerConfig,
        deviceSignerKeyStorage: DeviceSignerKeyStorage
    ): Promise<string> {
        const publicKey = await deviceSignerKeyStorage.generateKey({
            biometricPolicy: signer.biometricPolicy,
            ...(signer.biometricPolicy === "session" && { biometricExpirationTime: signer.biometricExpirationTime }),
        });

        return `device:${publicKey}`;
    }

    private mutateSignerFromCustomAuth<C extends Chain>(args: WalletArgsFor<C>, isNewWalletSigner = false): void {
        const { experimental_customAuth } = this.apiClient.crossmint;
        if (args.signer.type === "email" && experimental_customAuth?.email != null) {
            args.signer.email = args.signer.email ?? experimental_customAuth.email;
        }
        if (args.signer.type === "phone" && experimental_customAuth?.phone != null) {
            args.signer.phone = args.signer.phone ?? experimental_customAuth.phone;
        }
        if (args.signer.type === "external-wallet" && experimental_customAuth?.externalWalletSigner != null) {
            args.signer = isNewWalletSigner
                ? ({
                      type: "external-wallet",
                      address: experimental_customAuth.externalWalletSigner.address,
                  } as SignerConfigForChain<C>)
                : (experimental_customAuth.externalWalletSigner as SignerConfigForChain<C>);
        }
        return;
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

        // Validate adminSigner if present on args (new WalletCreateArgs shape)
        if ("adminSigner" in args && args.adminSigner != null) {
            let expectedAdminSigner: SignerConfigForChain<C> = args.adminSigner as SignerConfigForChain<C>;
            const config = existingWallet.config as SmartWalletConfig;
            const existingWalletSigner = config?.adminSigner;

            const tempArgs = { chain: args.chain, signer: expectedAdminSigner } as WalletArgsFor<C>;
            this.mutateSignerFromCustomAuth(tempArgs);
            expectedAdminSigner = tempArgs.signer;

            if (expectedAdminSigner != null && existingWalletSigner != null) {
                if (expectedAdminSigner.type !== existingWalletSigner.type) {
                    throw new WalletCreationError(
                        "The wallet adminSigner type does not match the existing wallet's adminSigner type"
                    );
                }
                compareSignerConfigs(expectedAdminSigner, existingWalletSigner);
            }

            if ("delegatedSigners" in args && args.delegatedSigners != null) {
                this.validateDelegatedSigners(existingWallet, args.delegatedSigners);
            }
        }

        // signer may be optional in WalletCreateArgs; skip validation when absent
        const signer = "signer" in args ? args.signer : undefined;
        if (signer != null) {
            this.validateSignerCanUseWallet(existingWallet, signer);
        }
    }

    private validateSignerCanUseWallet<C extends Chain>(
        wallet: GetWalletSuccessResponse,
        signer: SignerConfigForChain<C>
    ): void {
        const config = wallet.config as SmartWalletConfig;
        const adminSigner = config?.adminSigner;
        const delegatedSigners = config?.delegatedSigners || [];

        // Device signer is always allowed as it can be added during transaction creation
        if (signer.type === "device") {
            return;
        }

        if (
            adminSigner != null &&
            (this.isMatchingPasskeySigner(signer, adminSigner, config) ||
                this.getSignerLocator(signer) === (adminSigner as PasskeySignerConfig).locator)
        ) {
            try {
                compareSignerConfigs(signer, adminSigner);
                return;
            } catch {}
        }

        const delegatedSigner = delegatedSigners.find(
            (ds) => this.isMatchingPasskeySigner(signer, ds, config) || this.getSignerLocator(signer) === ds.locator
        );

        if (delegatedSigner != null) {
            try {
                compareSignerConfigs(signer, delegatedSigner);
                return;
            } catch {}
        }

        throw new WalletCreationError(
            `Signer cannot use wallet "${wallet.address}". The provided signer is neither the admin nor a delegated signer.`
        );
    }

    private getSignerLocator<C extends Chain>(signer: SignerConfigForChain<C> | RegisterSignerPasskeyParams): string {
        if (signer.type === "external-wallet") {
            return `external-wallet:${signer.address}`;
        }
        if (signer.type === "email" && signer.email) {
            return `email:${signer.email}`;
        }
        if (signer.type === "phone" && signer.phone) {
            return `phone:${signer.phone}`;
        }
        if (signer.type === "passkey" && "id" in signer) {
            return `passkey:${signer.id}`;
        }
        if (signer.type === "api-key") {
            return "api-key";
        }
        return signer.type;
    }

    private validateDelegatedSigners<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        inputDelegatedSigners: Array<SignerConfigForChain<C>>
    ): void {
        const config = existingWallet.config as SmartWalletConfig;
        const existingDelegatedSigners = config?.delegatedSigners;

        // If no delegated signers specified in input, no validation needed
        if (inputDelegatedSigners.length === 0) {
            return;
        }

        // If input has delegated signers but wallet has none, that's an error
        if (existingDelegatedSigners == null || existingDelegatedSigners.length === 0) {
            throw new WalletCreationError(
                `${inputDelegatedSigners.length} delegated signer(s) specified, but wallet "${existingWallet.address}" has no delegated signers. ${DELEGATED_SIGNER_MISMATCH_ERROR}`
            );
        }

        inputDelegatedSigners.forEach((s) => this.mutateSignerFromCustomAuth({ signer: s } as WalletArgsFor<C>));
        for (const inputSigner of inputDelegatedSigners) {
            const matchingExistingSigner = existingDelegatedSigners.find((existingSigner) => {
                if (this.isMatchingPasskeySigner(inputSigner, existingSigner, config)) {
                    return true;
                }
                if (existingSigner.type === "device" && inputSigner.type === "device") {
                    return true;
                }
                return existingSigner.locator === this.getSignerLocator(inputSigner);
            });

            if (matchingExistingSigner == null) {
                const walletSigners = existingDelegatedSigners.map((s) => s.locator).join(", ");
                throw new WalletCreationError(
                    `Delegated signer '${inputSigner.type}' does not exist in wallet "${existingWallet.address}". Available delegated signers: ${walletSigners}. ${DELEGATED_SIGNER_MISMATCH_ERROR}`
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
        inputSigner: SignerConfigForChain<C>,
        existingSigner: SmartWalletConfig["adminSigner"] | DelegatedSignerResponse,
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

    private async registerDelegatedSigners<C extends Chain>(
        delegatedSigners?: Array<SignerConfigForChain<C>>,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage,
        isServerSide?: boolean
    ): Promise<Array<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }>> {
        return await Promise.all(
            delegatedSigners?.map(
                async (signer): Promise<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }> => {
                    if (signer.type === "passkey") {
                        if (signer.id == null) {
                            return { signer: await this.createPasskeySigner(signer) };
                        }
                        return { signer };
                    }
                    if (signer.type === "device") {
                        // Server-side: device signer must already have a publicKey
                        if (isServerSide) {
                            if (signer.publicKey == null) {
                                throw new WalletCreationError(
                                    "Device signer created server-side must include a publicKey. " +
                                        "Use CrossmintWallets.createDeviceSigner() on the client first, then send the result to the server."
                                );
                            }
                            return { signer: `device:${signer.publicKey}` };
                        }
                        // Client-side: auto-generate key if none provided
                        if (signer.publicKey != null) {
                            return { signer: `device:${signer.publicKey}` };
                        }
                        if (deviceSignerKeyStorage == null) {
                            throw new WalletCreationError("Device signer key storage is required for device signers");
                        }
                        return { signer: await this.createDeviceSigner(signer, deviceSignerKeyStorage) };
                    }
                    return { signer: this.getSignerLocator(signer) };
                }
            ) ?? []
        );
    }

    private async buildDelegatedSigners<C extends Chain>(
        args: WalletCreateArgs<C>
    ): Promise<Array<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }>> {
        const delegatedSigners = args.delegatedSigners;
        return await this.registerDelegatedSigners(
            delegatedSigners,
            args.options?.deviceSignerKeyStorage,
            this.apiClient.isServerSide
        );
    }

    /**
     * Extract biometric policy from the first device signer in delegatedSigners
     * to send at the wallet config level (not inside individual delegated signers).
     */
    private extractDeviceSignerConfig<C extends Chain>(
        args: WalletCreateArgs<C>
    ): { biometricPolicy: string; expirationTime?: number } | undefined {
        const deviceSigner = args.delegatedSigners?.find((s) => s.type === "device") as
            | DeviceSignerConfig
            | CreatedDeviceSigner
            | undefined;
        if (deviceSigner == null) {
            return undefined;
        }
        const policy = deviceSigner.biometricPolicy ?? "none";
        return {
            biometricPolicy: policy,
            ...(policy === "session" &&
            "biometricExpirationTime" in deviceSigner &&
            deviceSigner.biometricExpirationTime != null
                ? { expirationTime: deviceSigner.biometricExpirationTime }
                : {}),
        };
    }

    /**
     * Build wallet locator for createWallet idempotency check (client-side only).
     */
    private getCreateWalletLocator<C extends Chain>(args: WalletCreateArgs<C>): string {
        return `me:${this.getChainType(args.chain)}:smart` + (args.alias != null ? `:alias:${args.alias}` : "");
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

    private validateChainEnvironment<C extends Chain>(chain: C): C {
        if (chain === "solana" || chain === "stellar") {
            return chain;
        }

        const evmChain = chain as EVMSmartWalletChain;
        const environment = this.apiClient.environment;
        const isProduction = environment === APIKeyEnvironmentPrefix.PRODUCTION;

        if (isProduction && isTestnetChain(evmChain)) {
            throw new InvalidEnvironmentError(
                `Chain "${chain}" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.`
            );
        }

        if (!isProduction && isMainnetChain(evmChain)) {
            const testnetEquivalent = mainnetToTestnet(evmChain);
            if (testnetEquivalent != null) {
                walletsLogger.debug("walletFactory.validateChainEnvironment.autoConverted", {
                    chain,
                    convertedTo: testnetEquivalent,
                    environment,
                    message: `Chain "${chain}" is a mainnet chain and cannot be used in ${environment} environment. Automatically converted to "${testnetEquivalent}".`,
                });
                return testnetEquivalent as unknown as C;
            }
            walletsLogger.debug("walletFactory.validateChainEnvironment.mismatch", {
                chain,
                environment,
                message: `Chain "${chain}" is a mainnet chain and should not be used in ${environment} environment. No testnet equivalent is available. Please use a testnet chain instead.`,
            });
        }

        return chain;
    }
}
