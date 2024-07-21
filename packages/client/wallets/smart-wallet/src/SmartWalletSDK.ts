import { EVMBlockchainIncludingTestnet, validateAPIKey } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "./api/CrossmintWalletService";
import type { EVMSmartWallet } from "./blockchain/wallets";
import { SmartWalletService } from "./blockchain/wallets/service";
import { RunningOnServerError } from "./error";
import type { SmartWalletSDKInitParams, UserParams, WalletConfig } from "./types/Config";
import { isClient } from "./utils/environment";
import { LoggerWrapper, logPerformance } from "./utils/log";

export class SmartWalletSDK extends LoggerWrapper {
    private constructor(private readonly smartWalletService: SmartWalletService) {
        super("SmartWalletSDK");
    }

    /**
     * Initializes the SDK with the **client side** API key obtained from the Crossmint console.
     * @throws error if the api key is not formatted correctly.
     */
    static init({ clientApiKey }: SmartWalletSDKInitParams): SmartWalletSDK {
        if (!isClient()) {
            throw new RunningOnServerError();
        }

        const validationResult = validateAPIKey(clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintWalletService(clientApiKey);
        return new SmartWalletSDK(new SmartWalletService(crossmintService));
    }

    async getOrCreateWallet(
        user: UserParams,
        chain: EVMBlockchainIncludingTestnet,
        walletConfig: WalletConfig
    ): Promise<EVMSmartWallet> {
        return logPerformance(
            "GET_OR_CREATE_WALLET",
            async () => {
                return await this.smartWalletService.getOrCreate(user, chain, walletConfig);
            },
            { user, chain }
        );
    }
}
