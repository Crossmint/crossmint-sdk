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
import type { PasskeySignerConfig, SignerConfigForChain } from "../signers/types";
import { Wallet } from "./wallet";
import type { DelegatedSigner, WalletArgsFor, WalletCreateArgs } from "./types";
import { compareSignerConfigs, normalizeValueForComparison } from "../utils/signer-validation";
import { getSignerLocator } from "../utils/signer-locator";
import { deriveServerSignerDetails } from "../signers/server";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";
import { createDeviceSigner } from "@/utils/device-signers";

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
        await validatedArgs.options?._callbacks?.onWalletCreationStart?.();
        walletsLogger.info("walletFactory.createWallet.start");

        if (!this.apiClient.isServerSide && validatedArgs.owner != null) {
            walletsLogger.error("walletFactory.createWallet.error", {
                error: "Owner field cannot be specified in client-side createWallet calls",
            });
            throw new WalletCreationError(
                "Owner field cannot be specified in client-side createWallet calls. Owner is determined from JWT authentication."
            );
        }

        // Include device signer in the signers array when deviceSignerKeyStorage is available (client-side)
        const signersWithDevice =
            validatedArgs.options?.deviceSignerKeyStorage != null
                ? this.ensureDeviceSignerInSigners(validatedArgs)
                : validatedArgs.signers ?? [];
        const builtSigners = await this.registerSigners(
            signersWithDevice,
            validatedArgs.chain,
            validatedArgs.options?.deviceSignerKeyStorage
        );

        let adminSigner;
        if (validatedArgs.recovery.type === "passkey" && validatedArgs.recovery.id == null) {
            adminSigner = await this.createPasskeySigner(validatedArgs.recovery);
        } else if (validatedArgs.recovery.type === "server") {
            const { derivedAddress } = deriveServerSignerDetails(
                validatedArgs.recovery,
                validatedArgs.chain,
                this.apiClient.projectId,
                this.apiClient.environment
            );
            adminSigner = { type: "server", address: derivedAddress };
        } else {
            adminSigner = validatedArgs.recovery;
        }

        const walletResponse = await this.apiClient.createWallet({
            type: "smart",
            chainType: this.getChainType(validatedArgs.chain),
            config: {
                adminSigner,
                ...(validatedArgs.plugins ? { plugins: validatedArgs.plugins } : {}),
                ...(builtSigners != null ? { delegatedSigners: builtSigners } : {}),
            },
            owner: validatedArgs.owner ?? undefined,
            alias: validatedArgs.alias ?? undefined,
        } as CreateWalletParams);

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

    private createWalletInstance<C extends Chain>(
        walletResponse: GetWalletSuccessResponse,
        args: WalletArgsFor<C>
    ): Wallet<C> {
        this.validateExistingWalletConfig(walletResponse, args);

        return new Wallet(
            {
                chain: args.chain,
                address: walletResponse.address,
                owner: walletResponse.owner,
                options: args.options,
                alias: args.alias,
                recovery: (walletResponse.config as SmartWalletConfig).adminSigner as SignerConfigForChain<C>,
            },
            this.apiClient
        );
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
                // Server signer uses a "server" type on the API side
                const expectedApiType = createArgs.recovery.type === "server" ? "server" : createArgs.recovery.type;
                if (expectedApiType !== existingWalletSigner.type) {
                    throw new WalletCreationError(
                        "The wallet recovery signer type does not match the existing wallet's recovery signer type"
                    );
                }
                if (createArgs.recovery.type !== "server") {
                    compareSignerConfigs(createArgs.recovery, existingWalletSigner);
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
        inputSigners: Array<SignerConfigForChain<C>>,
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
                    const { derivedAddress } = deriveServerSignerDetails(
                        inputSigner,
                        chain,
                        this.apiClient.projectId,
                        this.apiClient.environment
                    );
                    return existingSigner.locator === `server:${derivedAddress}`;
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
        chain?: C,
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
                        const deviceSigner = await createDeviceSigner(deviceSignerKeyStorage);
                        return { signer: deviceSigner.locator };
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
