import { CrossmintWalletService } from "@/api";
import { EVMSmartWallet, getBundlerRPC } from "@/blockchain";
import { type SmartWalletSDKInitParams, type UserParams, type WalletConfig, isPasskeySigner } from "@/types";
import { WalletSdkError } from "@/utils";
import { ENTRYPOINT_ADDRESS_V06, ENTRYPOINT_ADDRESS_V07 } from "permissionless";
import { EntryPointVersion } from "permissionless/types/entrypoint";
import { createPublicClient, http } from "viem";

import { EVMBlockchainIncludingTestnet, validateAPIKey } from "@crossmint/common-sdk-base";

import EOAWalletService from "./blockchain/wallets/eoa";
import PasskeyWalletService from "./blockchain/wallets/passkey";
import { LoggerWrapper, logPerformance } from "./utils/log";

export class SmartWalletSDK extends LoggerWrapper {
    private readonly crossmintService: CrossmintWalletService;
    private readonly eaoWalletService: EOAWalletService;
    private readonly passkeyWalletService: PasskeyWalletService;

    private constructor(config: SmartWalletSDKInitParams) {
        super("SmartWalletSDK");
        this.crossmintService = new CrossmintWalletService(config.clientApiKey);
        this.eaoWalletService = new EOAWalletService(this.crossmintService);
        this.passkeyWalletService = new PasskeyWalletService(this.crossmintService, config.clientApiKey);
    }

    /**
     * Initializes the SDK with the **client side** API key obtained from the Crossmint console.
     * @throws error if the api key is not formatted correctly.
     */
    static init(config: SmartWalletSDKInitParams): SmartWalletSDK {
        const validationResult = validateAPIKey(config.clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }
        return new SmartWalletSDK(config);
    }

    async getOrCreateWallet(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        config: WalletConfig = { signer: { type: "PASSKEY", passkeyName: user.id } }
    ): Promise<EVMSmartWallet> {
        return logPerformance(
            "GET_OR_CREATE_WALLET",
            async () => {
                try {
                    const entryPointVersion = await this.getEntryPointVersion(user, chain);
                    const publicClient = createPublicClient({
                        transport: http(getBundlerRPC(chain)),
                    });

                    if (isPasskeySigner(config.signer)) {
                        return this.passkeyWalletService.getOrCreate({
                            user,
                            chain,
                            publicClient,
                            signer: config.signer,
                        });
                    } else {
                        return this.eaoWalletService.getOrCreate({
                            user,
                            chain,
                            publicClient,
                            entryPointVersion,
                            entryPoint: entryPointVersion === "v0.6" ? ENTRYPOINT_ADDRESS_V06 : ENTRYPOINT_ADDRESS_V07,
                            config,
                        });
                    }
                } catch (error: any) {
                    throw new WalletSdkError(`Error creating the Wallet ${error?.message ? `: ${error.message}` : ""}`);
                }
            },
            { user, chain }
        );
    }

    private async getEntryPointVersion(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet
    ): Promise<EntryPointVersion> {
        const { entryPointVersion } = await this.crossmintService.getAbstractWalletEntryPointVersion(
            { type: "whiteLabel", userId: user.id },
            chain
        );
        return entryPointVersion;
    }
}
