import { UserOperation } from "permissionless";
import { EntryPoint, GetEntryPointVersion } from "permissionless/types/entrypoint";
import { stringify } from "viem";

import { validateAPIKey } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "./api/CrossmintWalletService";
import { SmartWalletChain } from "./blockchain/chains";
import type { EVMSmartWallet } from "./blockchain/wallets";
import { ClientDecorator } from "./blockchain/wallets/clientDecorator";
import { SmartWalletService } from "./blockchain/wallets/service";
import { SmartWalletSDKError } from "./error";
import { ErrorProcessor } from "./error/processor";
import { DatadogProvider } from "./services/logging/DatadogProvider";
import type { SmartWalletSDKInitParams, UserParams, WalletParams } from "./types/Config";
import { isClient } from "./utils/environment";
import { LoggerWrapper, logPerformance } from "./utils/log";

export class SmartWalletSDK extends LoggerWrapper {
    private constructor(
        private readonly smartWalletService: SmartWalletService,
        private readonly errorProcessor: ErrorProcessor
    ) {
        super("SmartWalletSDK");
    }

    /**
     * Initializes the SDK with the **client side** API key obtained from the Crossmint console.
     * @throws error if the api key is not formatted correctly.
     */
    static init({ clientApiKey }: SmartWalletSDKInitParams): SmartWalletSDK {
        if (!isClient()) {
            throw new SmartWalletSDKError("Smart Wallet SDK should only be used client side.");
        }

        const validationResult = validateAPIKey(clientApiKey);
        if (!validationResult.isValid) {
            throw new Error("API key invalid");
        }

        const crossmintService = new CrossmintWalletService(clientApiKey);
        const errorProcessor = new ErrorProcessor(new DatadogProvider());
        return new SmartWalletSDK(
            new SmartWalletService(crossmintService, new ClientDecorator(errorProcessor)),
            errorProcessor
        );
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
        return logPerformance(
            "GET_OR_CREATE_WALLET",
            async () => {
                try {
                    return await this.smartWalletService.getOrCreate(user, chain, walletParams);
                } catch (error: any) {
                    throw this.errorProcessor.map(
                        error,
                        new SmartWalletSDKError(`Wallet creation failed: ${error.message}.`, stringify(error))
                    );
                }
            },
            { user, chain }
        );
    }

    async sponsorUserOperation<E extends EntryPoint>(
        user: UserParams,
        userOp: UserOperation<GetEntryPointVersion<E>>,
        entryPoint: E,
        chain: SmartWalletChain
    ) {
        return logPerformance(
            "SPONSOR_USER_OPERATION",
            async () => {
                try {
                    const { sponsorUserOpParams } = await this.smartWalletService.sponsorUserOperation(
                        user,
                        userOp,
                        entryPoint,
                        chain
                    );
                    return sponsorUserOpParams;
                } catch (error: any) {
                    throw this.errorProcessor.map(
                        error,
                        new SmartWalletSDKError(`Sponsoring user operation failed: ${error.message}.`, stringify(error))
                    );
                }
            },
            { chain }
        );
    }
}
