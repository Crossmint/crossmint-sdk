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
import type {
    type Chain,
    type EVMSmartWalletChain,
    isTestnetChain,
    isMainnetChain,
    mainnetToTestnet,
} from "../chains/chains";
import type {
    ApiKeyInternalSignerConfig,
    DeviceInternalSignerConfig,
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
};

export class WalletFactory {
    constructor(private readonly apiClient: ApiClient) {}

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.getOrCreateWallet",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            const walletArgs = args[0] as WalletCreateArgs<Chain>;
            return { chain: walletArgs.chain, signerType: walletArgs.signer.type };
        },
    })
    public async getOrCreateWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
        if (this.apiClient.isServerSide) {
            walletsLogger.error("walletFactory.getOrCreateWallet.error", {
                error: "getOrCreateWallet can only be called from client-side code",
            });
            throw new WalletCreationError(
                "getOrCreateWallet can only be called from client-side code.\n- Make sure you're running this in the browser (or another client environment), not on your server.\n- Use your Crossmint Client API Key (not a server key)."
            );
        }

        if (args.owner != null) {
            walletsLogger.error("walletFactory.getOrCreateWallet.error", {
                error: "Owner field cannot be specified in client-side getOrCreateWallet calls",
            });
            throw new WalletCreationError(
                "Owner field cannot be specified in client-side getOrCreateWallet calls. Owner is determined from JWT authentication."
            );
        }
        args = { ...args, chain: this.validateChainEnvironment(args.chain) };

        const locator = this.getWalletLocator<C>(args);
        walletsLogger.info("walletFactory.getOrCreateWallet.start");

        const existingWallet = await this.apiClient.getWallet(locator);

        if (existingWallet != null && !("error" in existingWallet)) {
            walletsLogger.info("walletFactory.getOrCreateWallet.existing", {
                address: existingWallet.address,
            });
            return await this.createWalletInstance(existingWallet, args);
        }

        walletsLogger.info("walletFactory.getOrCreateWallet.creating");
        return this.createWalletInternal(args);
    }

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
                    "getWallet with walletLocator is not supported on client side, use getOrCreateWallet instead"
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

        return await this.createWalletInstance(existingWallet, args);
    }

    @WithLoggerContext({
        logger: walletsLogger,
        methodName: "walletFactory.createWallet",
        buildContext(_thisArg: WalletFactory, args: unknown[]) {
            const walletArgs = args[0] as WalletCreateArgs<Chain>;
            return { chain: walletArgs.chain, signerType: walletArgs.signer.type };
        },
    })
    public async createWallet<C extends Chain>(args: WalletCreateArgs<C>): Promise<Wallet<C>> {
        args = { ...args, chain: this.validateChainEnvironment(args.chain) };
        await args.options?.experimental_callbacks?.onWalletCreationStart?.();
        walletsLogger.info("walletFactory.createWallet.start");

        let adminSignerConfig = args.onCreateConfig?.adminSigner ?? args.signer;
        if (adminSignerConfig.type === "device") {
            throw new WalletCreationError("Device signer cannot be used as admin signer");
        }
        const delegatedSigners = await this.buildDelegatedSigners(args);
        const tempArgs = { ...args, signer: adminSignerConfig };
        this.mutateSignerFromCustomAuth(tempArgs, true);
        adminSignerConfig = tempArgs.signer;
        const adminSigner =
            adminSignerConfig.type === "passkey" && adminSignerConfig.id == null
                ? await this.createPasskeySigner(adminSignerConfig)
                : adminSignerConfig;

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(args.chain),
            config: {
                adminSigner,
                ...(args?.plugins ? { plugins: args.plugins } : {}),
                ...(delegatedSigners != null ? { delegatedSigners } : {}),
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

        await this.saveDeviceSignerKey(walletResponse.address, delegatedSigners, args.options?.deviceSignerKeyStorage);

        walletsLogger.info("walletFactory.createWallet.success", {
            address: walletResponse.address,
        });

        return await this.createWalletInstance(walletResponse, args);
    }

    private async saveDeviceSignerKey(
        address: string,
        delegatedSigners: Awaited<ReturnType<typeof this.buildDelegatedSigners>>,
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
    ) {
        const deviceSigner = delegatedSigners.find(
            (delegatedSigner): delegatedSigner is DelegatedSigner =>
                typeof delegatedSigner.signer === "string" && delegatedSigner.signer.startsWith("device:")
        );
        if (deviceSigner && deviceSignerKeyStorage) {
            await deviceSignerKeyStorage.mapAddressToKey(address, deviceSigner.signer.split(":")[1]);
        }
    }

    private async createWalletInstance<C extends Chain>(
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
                const deviceSigner = await options?.deviceSignerKeyStorage?.getKey(walletResponse.address);
                if (!deviceSigner) {
                    // TODO: WAL-9101 Add Device signer when not available in the device
                    throw new WalletCreationError("Device signer not found");
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

    private async createDeviceSigner<C extends Chain>(
        signer: SignerConfigForChain<C>,
        deviceSignerKeyStorage: DeviceSignerKeyStorage
    ): Promise<string> {
        if (signer.type !== "device") {
            throw new Error("Signer is not a device");
        }

        const publicKey = await deviceSignerKeyStorage.generateKey();

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

        if ("onCreateConfig" in args && args.onCreateConfig != null) {
            let expectedAdminSigner = args.onCreateConfig?.adminSigner ?? args.signer;
            const config = existingWallet.config as SmartWalletConfig;
            const existingWalletSigner = config?.adminSigner;

            const tempArgs = { ...args, signer: expectedAdminSigner };
            this.mutateSignerFromCustomAuth(tempArgs);
            expectedAdminSigner = tempArgs.signer;

            if (expectedAdminSigner != null && existingWalletSigner != null) {
                if (expectedAdminSigner.type !== existingWalletSigner.type) {
                    throw new WalletCreationError(
                        "The wallet signer type provided in onCreateConfig does not match the existing wallet's adminSigner type"
                    );
                }
                compareSignerConfigs(expectedAdminSigner, existingWalletSigner);
            }

            if (args.onCreateConfig?.delegatedSigners != null) {
                this.validateDelegatedSigners(existingWallet, args.onCreateConfig.delegatedSigners);
            }
        }

        this.validateSignerCanUseWallet(existingWallet, args.signer);
    }

    private validateSignerCanUseWallet<C extends Chain>(
        wallet: GetWalletSuccessResponse,
        signer: SignerConfigForChain<C>
    ): void {
        const config = wallet.config as SmartWalletConfig;
        const adminSigner = config?.adminSigner;
        const delegatedSigners = config?.delegatedSigners || [];

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
            (ds) =>
                this.isMatchingPasskeySigner(signer, ds, config) ||
                (ds.type === "device" && signer.type === "device") ||
                this.getSignerLocator(signer) === ds.locator
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
        deviceSignerKeyStorage?: DeviceSignerKeyStorage
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
                        if (deviceSignerKeyStorage == null) {
                            throw new Error("Device signer key storage is required for device signers");
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
        const delegatedSigners = args.onCreateConfig?.delegatedSigners;
        return await this.registerDelegatedSigners(delegatedSigners, args.options?.deviceSignerKeyStorage);
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
