import { type APIKeyEnvironmentPrefix, validateAPIKey } from "@crossmint/common-sdk-base";
import { stringify } from "viem";

import type { SmartWalletChain } from "./evm/chains";
import { isMainnetChain, isTestnetChain } from "./evm/chains";
import { SmartWalletError } from "./error";
import { scwDatadogLogger, scwLogger } from "./services";
import type { EVMSmartWallet } from "./evm/wallet";
import { ErrorProcessor } from "./error/processor";
import { isClient } from "@crossmint/client-sdk-base";
import { SmartWalletService, type UserParams, type WalletParams } from "./smartWalletService";
import { CrossmintApiService } from "./apiService";

export interface SmartWalletSDKInitParams {
    clientApiKey: string;
};

export class SmartWalletSDK {
    private constructor(
        private readonly crossmintEnv: APIKeyEnvironmentPrefix,
        private readonly smartWalletService: SmartWalletService,
        private readonly errorProcessor: ErrorProcessor,
        private readonly logger = scwLogger
    ) {}

    /**
     * Initializes the SDK with the **client side** API key obtained from the Crossmint console.
     * @throws error if the api key is not formatted correctly.
     */
    static init(params: SmartWalletSDKInitParams): SmartWalletSDK {
        const { clientApiKey } = params;
        const validationResult = validateAPIKey(clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintApiService(clientApiKey);
        const smartWalletService = new SmartWalletService(crossmintService);
        const errorProcessor = new ErrorProcessor(scwDatadogLogger);

        return new SmartWalletSDK(validationResult.environment, smartWalletService, errorProcessor);
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
        walletParams: WalletParams
    ): Promise<EVMSmartWallet> {
        if (!isClient()) {
            throw new SmartWalletError("Smart Wallet SDK should only be used client side.");
        }
        this.assertValidChain(chain);

        return await this.logger.logPerformance("GET_OR_CREATE_WALLET", async () => {
            try {
                return await this.smartWalletService.getOrCreate(user, chain, walletParams);
            } catch (error: unknown) {
                throw this.errorProcessor.map(
                    error,
                    new SmartWalletError(
                        `Wallet creation failed: ${(error as { message: string }).message}.`,
                        stringify(error)
                    )
                );
            }
        });
    }

    private assertValidChain(chain: SmartWalletChain) {
        if (!this.validChain(chain)) {
            throw new SmartWalletError(
                `The selected chain "${chain}" is not available in "${this.crossmintEnv}". Either set a valid chain or check you're using an API key for the environment you're trying to target.`
            );
        }
    }

    private validChain(chain: SmartWalletChain): boolean {
        if (this.crossmintEnv === "development" || this.crossmintEnv === "staging") {
            return isTestnetChain(chain);
        }

        return isMainnetChain(chain);
    }
}
