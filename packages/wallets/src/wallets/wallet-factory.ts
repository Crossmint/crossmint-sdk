import { WithLoggerContext } from "@crossmint/common-sdk-base";
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
import { WalletCreationError, WalletNotAvailableError } from "../utils/errors";
import { type Chain, validateChainForEnvironment } from "../chains/chains";
import type {
    ApiKeyInternalSignerConfig,
    DeviceInternalSignerConfig,
    DeviceSignerConfig,
    EmailInternalSignerConfig,
    EmailSignerConfig,
    InternalSignerConfig,
    PasskeyInternalSignerConfig,
    PasskeySignerConfig,
    PhoneInternalSignerConfig,
    PhoneSignerConfig,
    SignerConfigForChain,
    Signer,
} from "../signers/types";
import { Wallet } from "./wallet";
import { assembleSigner } from "../signers";
import type { DelegatedSigner, WalletArgsFor, WalletCreateArgs, WalletOptions } from "./types";
import { compareSignerConfigs, normalizeValueForComparison } from "../utils/signer-validation";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";

const SIGNER_MISMATCH_ERROR =
    "When 'signers' is provided to a method that may fetch an existing wallet, each specified signer must exist in that wallet's configuration.";

type SmartWalletConfig = {
    adminSigner: AdminSignerConfig | PasskeySignerConfig;
    delegatedSigners?: DelegatedSignerResponse[];
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

        args = { ...args, chain: validateChainForEnvironment(args.chain, this.apiClient.environment) };

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

        // Always resolve device signer and set as operational signer
        const deviceSignerConfig = await this.resolveDeviceSignerForGetWallet<C>(
            existingWallet,
            args.options?.deviceSignerKeyStorage
        );

        return await this.createWalletInstance(existingWallet, args, deviceSignerConfig);
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
        args = { ...args, chain: validateChainForEnvironment(args.chain, this.apiClient.environment) };
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();
        walletsLogger.info("walletFactory.createWallet.start");

        const recoverySignerConfig = this.mutateSignerFromCustomAuth(args.recovery, true);

        if (!this.apiClient.isServerSide && args.owner != null) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: "Owner field cannot be specified in client-side createWallet calls",
            });
            throw new WalletCreationError(
                "Owner field cannot be specified in client-side createWallet calls. Owner is determined from JWT authentication."
            );
        }

        // Include device signer in the signers array when deviceSignerKeyStorage is available (client-side)
        const signersWithDevice = args.options?.deviceSignerKeyStorage
            ? this.ensureDeviceSignerInSigners(args)
            : args.signers ?? [];
        const builtSigners = await this.registerSigners(signersWithDevice, args.options?.deviceSignerKeyStorage);

        const adminSigner =
            recoverySignerConfig.type === "passkey" && recoverySignerConfig.id == null
                ? await this.createPasskeySigner(recoverySignerConfig)
                : recoverySignerConfig;

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(args.chain),
            config: {
                adminSigner,
                ...(args?.plugins ? { plugins: args.plugins } : {}),
                ...(builtSigners != null ? { delegatedSigners: builtSigners } : {}),
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
            builtSigners,
            args.options?.deviceSignerKeyStorage
        );

        walletsLogger.info("walletFactory.createWallet.success", {
            address: walletResponse.address,
        });

        // Resolve device signer as the operational signer
        const deviceSignerConfig = await this.resolveDeviceSignerForGetWallet<C>(
            walletResponse,
            args.options?.deviceSignerKeyStorage
        );

        return await this.createWalletInstance(walletResponse, args, deviceSignerConfig);
    }

    private async saveDeviceSignerKeyIfNeeded(
        address: string,
        builtSigners: Awaited<ReturnType<typeof this.buildSigners>>,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ) {
        const deviceSigner = builtSigners.find(
            (s): s is DelegatedSigner => typeof s.signer === "string" && s.signer.startsWith("device:")
        );
        if (deviceSigner && deviceSignerKeyStorage == null) {
            throw new WalletCreationError("Device signer key storage is required for device signers");
        }
        if (deviceSigner && deviceSignerKeyStorage) {
            await deviceSignerKeyStorage.mapAddressToKey(address, deviceSigner.signer.split(":")[1]);
        }
    }

    private async createWalletInstance<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletArgsFor<C>,
        deviceSignerConfig?: DeviceSignerConfig
    ): Promise<Wallet<C>> {
        this.validateExistingWalletConfig(walletResponse, args);

        let signer: Signer | undefined;
        if (deviceSignerConfig != null) {
            const signerConfig = await this.toInternalSignerConfig(
                walletResponse,
                deviceSignerConfig as SignerConfigForChain<C>,
                args.options
            );
            signer = assembleSigner(args.chain, signerConfig, args.options?.deviceSignerKeyStorage);
        }

        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                signer,
                options: args.options,
                alias: args.alias,
                recovery: (walletResponse.config as SmartWalletConfig).adminSigner as SignerConfigForChain<C>,
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
                    onAuthRequired: options?.experimental_callbacks?.onAuthRequired,
                    clientTEEConnection: options?.clientTEEConnection,
                } as EmailInternalSignerConfig;
            }
            case "device": {
                // If the device signer already has a locator, use it directly
                if (signerArgs.locator != null) {
                    return {
                        type: "device",
                        locator: signerArgs.locator,
                        address: walletResponse.address,
                    } as DeviceInternalSignerConfig;
                }

                // Otherwise, look up the key from deviceSignerKeyStorage
                if (options?.deviceSignerKeyStorage == null) {
                    throw new WalletCreationError(
                        "Either a device signer with a locator or deviceSignerKeyStorage is required for device signers"
                    );
                }
                const deviceSigner = await options.deviceSignerKeyStorage.getKey(walletResponse.address);
                if (!deviceSigner) {
                    return {
                        type: "device",
                        address: walletResponse.address,
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
                    onAuthRequired: options?.experimental_callbacks?.onAuthRequired,
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
        const publicKey = await deviceSignerKeyStorage.generateKey({});

        return `device:${publicKey}`;
    }

    /**
     * Ensures device signer is included in the signers array for wallet creation.
     * If no device signer is present in args.signers, adds one.
     */
    private ensureDeviceSignerInSigners<C extends Chain>(args: WalletCreateArgs<C>): Array<SignerConfigForChain<C>> {
        const signers = args.signers ?? [];
        const hasDeviceSigner = signers.some((s) => s.type === "device");
        if (!hasDeviceSigner) {
            return [...signers, { type: "device" } as SignerConfigForChain<C>];
        }
        return signers;
    }

    /**
     * Mutates signer config with values from experimental_customAuth.
     * For email/phone signers, fills in the email/phone from customAuth if not provided.
     * For external-wallet signers, uses the customAuth external wallet signer.
     */
    private mutateSignerFromCustomAuth<C extends Chain>(
        signer: SignerConfigForChain<C>,
        isNewWalletSigner = false
    ): SignerConfigForChain<C> {
        const { experimental_customAuth } = this.apiClient.crossmint;
        if (signer.type === "email" && experimental_customAuth?.email != null) {
            return { ...signer, email: signer.email ?? experimental_customAuth.email };
        }
        if (signer.type === "phone" && experimental_customAuth?.phone != null) {
            return { ...signer, phone: signer.phone ?? experimental_customAuth.phone };
        }
        if (signer.type === "external-wallet" && experimental_customAuth?.externalWalletSigner != null) {
            return isNewWalletSigner
                ? ({
                      type: "external-wallet",
                      address: experimental_customAuth.externalWalletSigner.address,
                  } as SignerConfigForChain<C>)
                : (experimental_customAuth.externalWalletSigner as SignerConfigForChain<C>);
        }
        return signer;
    }

    private async resolveDeviceSignerForGetWallet<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ): Promise<DeviceSignerConfig | undefined> {
        if (deviceSignerKeyStorage == null) {
            return undefined;
        }

        // Step 1: Check if a device signer is already assigned to the wallet address
        const existingKey = await deviceSignerKeyStorage.getKey(walletResponse.address);
        if (existingKey != null) {
            return {
                type: "device",
                locator: `device:${existingKey}`,
            };
        }

        // Step 2: Check whether any of the wallet's existing device signers are present on the current device
        const config = walletResponse.config as SmartWalletConfig;
        const delegatedSigners = config?.delegatedSigners || [];
        for (const delegatedSigner of delegatedSigners) {
            const locator = delegatedSigner.locator;
            if (delegatedSigner.type !== "device" || locator == null || !locator.startsWith("device:")) {
                continue;
            }
            const publicKeyBase64 = locator.replace("device:", "");
            const hasKey = await deviceSignerKeyStorage.hasKey(publicKeyBase64);
            if (hasKey) {
                // Found a matching device signer on this device - map address and use it
                await deviceSignerKeyStorage.mapAddressToKey(walletResponse.address, publicKeyBase64);
                return {
                    type: "device",
                    locator,
                };
            }
        }

        // Step 3: No matching device signer on device - return device signer without locator
        walletsLogger.info("walletFactory.resolveDeviceSignerForGetWallet.noDeviceSignerFound", {
            address: walletResponse.address,
        });
        return { type: "device" };
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
                const mutatedRecovery = this.mutateSignerFromCustomAuth(createArgs.recovery);
                if (mutatedRecovery.type !== existingWalletSigner.type) {
                    throw new WalletCreationError(
                        "The wallet recovery signer type does not match the existing wallet's recovery signer type"
                    );
                }
                compareSignerConfigs(mutatedRecovery, existingWalletSigner);
            }

            const inputSigners = createArgs.signers;
            if (inputSigners != null) {
                this.validateSigners(existingWallet, inputSigners);
            }
        }
    }

    private validateSignerCanUseWallet<C extends Chain>(
        wallet: GetWalletSuccessResponse,
        signer: SignerConfigForChain<C>
    ): void {
        const config = wallet.config as SmartWalletConfig;
        const adminSigner = config?.adminSigner;
        const delegatedSigners = config?.delegatedSigners || [];

        // Device signer: if it has a locator, validate it's a delegated signer of this wallet
        if (signer.type === "device") {
            const deviceSigner = signer as DeviceSignerConfig;
            if (deviceSigner.locator != null) {
                const isDelegated = delegatedSigners.some((ds) => ds.locator === deviceSigner.locator);
                if (!isDelegated) {
                    throw new WalletCreationError(
                        `Device signer with locator "${deviceSigner.locator}" is not a delegated signer of wallet "${wallet.address}".`
                    );
                }
            }
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
            `Signer cannot use wallet "${wallet.address}". The provided signer is neither the recovery signer nor a registered signer.`
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

    private validateSigners<C extends Chain>(
        existingWallet: GetWalletSuccessResponse,
        inputSigners: Array<SignerConfigForChain<C>>
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
                return existingSigner.locator === this.getSignerLocator(inputSigner);
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

    private async registerSigners<C extends Chain>(
        signersList?: Array<SignerConfigForChain<C>>,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ): Promise<Array<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }>> {
        return await Promise.all(
            signersList?.map(
                async (signer): Promise<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }> => {
                    if (signer.type === "passkey") {
                        if (signer.id == null) {
                            return { signer: await this.createPasskeySigner(signer) };
                        }
                        return { signer };
                    }
                    if (signer.type === "device") {
                        // If the device signer already has a locator (e.g., created via createDeviceSigner helper), use it directly
                        if (signer.locator != null) {
                            return { signer: signer.locator };
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

    private async buildSigners<C extends Chain>(
        args: WalletCreateArgs<C>
    ): Promise<Array<DelegatedSigner | RegisterSignerParams | { signer: PasskeySignerConfig }>> {
        const signersList = args.signers;
        return await this.registerSigners(signersList, args.options?.deviceSignerKeyStorage);
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
