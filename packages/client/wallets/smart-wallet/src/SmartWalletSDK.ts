import { stringify } from "viem";

import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "./api/CrossmintWalletService";
import type { SmartWalletChain } from "./blockchain/chains";
import type { EVMSmartWallet } from "./blockchain/wallets";
import { AccountConfigFacade } from "./blockchain/wallets/account/config";
import { AccountCreator } from "./blockchain/wallets/account/creator";
import { EOACreationStrategy } from "./blockchain/wallets/account/eoa";
import { PasskeyCreationStrategy } from "./blockchain/wallets/account/passkey";
import { ClientDecorator } from "./blockchain/wallets/clientDecorator";
import { SmartWalletService } from "./blockchain/wallets/service";
import { SmartWalletError } from "./error";
import { ErrorProcessor } from "./error/processor";
import { DatadogProvider } from "./services/logging/DatadogProvider";
import type { SmartWalletSDKInitParams, UserParams, WalletParams } from "./types/Config";
import { isClient } from "./utils/environment";
import { logPerformance } from "./utils/log";

export class SmartWalletSDK {
    private constructor(
        private readonly smartWalletService: SmartWalletService,
        private readonly errorProcessor: ErrorProcessor
    ) {}

    /**
     * Initializes the SDK with the **client side** API key obtained from the Crossmint console.
     * @throws error if the api key is not formatted correctly.
     */
    static init({ clientApiKey }: SmartWalletSDKInitParams): SmartWalletSDK {
        if (!isClient()) {
            throw new SmartWalletError("Smart Wallet SDK should only be used client side.");
        }

        const validationResult = validateAPIKey(clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintWalletService(clientApiKey);
        const errorProcessor = new ErrorProcessor(new DatadogProvider());
        const accountCreator = new AccountCreator(
            new EOACreationStrategy(),
            new PasskeyCreationStrategy(crossmintService.getPasskeyServerUrl(), clientApiKey)
        );
        const smartWalletService = new SmartWalletService(
            crossmintService,
            new AccountConfigFacade(crossmintService),
            accountCreator,
            new ClientDecorator(errorProcessor)
        );

        return new SmartWalletSDK(smartWalletService, errorProcessor);
    }

    /**
     * Retrieves or creates a wallet for the specified user.
     * The default configuration is a `PasskeySigner` with the name, which is displayed to the user during creation or signing prompts, derived from the provided jwt.
     *
     * Example using the default passkey signer:
     * ```ts
     * const wallet = await smartWalletSDK.getOrCreateWallet({ jwt: "xxx" }, "base");
     * ```
     */
    async getOrCreateWallet(
        user: UserParams,
        chain: SmartWalletChain,
        walletParams: WalletParams = { signer: { type: "PASSKEY" } }
    ): Promise<EVMSmartWallet> {
        return logPerformance("GET_OR_CREATE_WALLET", async () => {
            try {
                return await this.smartWalletService.getOrCreate(user, chain, walletParams);
            } catch (error: any) {
                throw this.errorProcessor.map(
                    error,
                    new SmartWalletError(`Wallet creation failed: ${error.message}.`, stringify(error))
                );
            }
        });
    }
}
