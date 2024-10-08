import { stringify } from "viem";

import { type APIKeyEnvironmentPrefix, validateAPIKey } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "./api/CrossmintWalletService";
import { type SmartWalletChain, isMainnetChain, isTestnetChain } from "./blockchain/chains";
import type { EVMSmartWallet } from "./blockchain/wallets";
import { AccountConfigCache } from "./blockchain/wallets/account/cache";
import { AccountConfigService } from "./blockchain/wallets/account/config";
import { AccountCreator } from "./blockchain/wallets/account/creator";
import { EOACreationStrategy } from "./blockchain/wallets/account/eoa";
import { PasskeyCreationStrategy } from "./blockchain/wallets/account/passkey";
import { ClientDecorator } from "./blockchain/wallets/clientDecorator";
import { SmartWalletService } from "./blockchain/wallets/service";
import { SmartWalletError } from "./error";
import { ErrorProcessor } from "./error/processor";
import { scwDatadogLogger, scwLogger } from "./services";
import type { SmartWalletSDKInitParams, UserParams, WalletParams } from "./types/params";
import { SDK_VERSION } from "./utils/constants";
import { isClient } from "./utils/environment";

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
    static init({ clientApiKey }: SmartWalletSDKInitParams): SmartWalletSDK {
        const validationResult = validateAPIKey(clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintWalletService(clientApiKey);
        const errorProcessor = new ErrorProcessor(scwDatadogLogger);
        const accountCreator = new AccountCreator(
            new EOACreationStrategy(),
            new PasskeyCreationStrategy(crossmintService.getPasskeyServerUrl(), clientApiKey)
        );
        const accountCache = new AccountConfigCache(`smart-wallet-${SDK_VERSION}`);

        const smartWalletService = new SmartWalletService(
            crossmintService,
            new AccountConfigService(crossmintService, accountCache),
            accountCreator,
            new ClientDecorator(errorProcessor)
        );

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
        walletParams: WalletParams = { signer: { type: "PASSKEY" } }
    ): Promise<EVMSmartWallet> {
        if (!isClient()) {
            throw new SmartWalletError("Smart Wallet SDK should only be used client side.");
        }
        this.assertValidChain(chain);

        return await this.logger.logPerformance("GET_OR_CREATE_WALLET", async () => {
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
