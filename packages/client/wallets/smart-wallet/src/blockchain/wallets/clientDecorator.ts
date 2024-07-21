import { SmartWalletSDKError, TransactionError } from "@/error";
import { ErrorMapper } from "@/error/mapper";
import { logInfo } from "@/services/logging";
import { gelatoBundlerProperties, usesGelatoBundler } from "@/utils/blockchain";
import { logPerformance } from "@/utils/log";
import { SmartAccountClient } from "permissionless";
import { EntryPoint } from "permissionless/types/entrypoint";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class AccountClientDecorator {
    constructor(private readonly errorMapper: ErrorMapper) {}

    public decorate<Client extends SmartAccountClient<EntryPoint>>({
        crossmintChain,
        smartAccountClient,
    }: {
        crossmintChain: EVMBlockchainIncludingTestnet;
        smartAccountClient: Client;
    }): Client {
        return {
            ...smartAccountClient,
            signMessage: (args) =>
                logPerformance("CrossmintSmartWallet.signMessage", async () => {
                    try {
                        return await smartAccountClient.signMessage(args);
                    } catch (error) {
                        throw this.errorMapper.map(
                            error,
                            new SmartWalletSDKError(
                                "Error signing message. If this error persists, please contact support."
                            )
                        );
                    }
                }),
            signTypedData: (data) =>
                logPerformance("CrossmintSmartWallet.signTypedData", async () => {
                    try {
                        return await smartAccountClient.signTypedData(data);
                    } catch (error) {
                        throw this.errorMapper.map(
                            error,
                            new SmartWalletSDKError(
                                `Error signing typed data. If this error persists, please contact support.`
                            )
                        );
                    }
                }),
            sendTransaction: (txn) =>
                logPerformance("CrossmintSmartWallet.sendTransaction", async () => {
                    try {
                        txn = {
                            ...txn,
                            ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
                        };

                        logInfo(`[CrossmintSmartWallet.sendTransaction] - params: ${JSON.stringify(txn)}`);
                        return await smartAccountClient.sendTransaction(txn);
                    } catch (error) {
                        throw this.errorMapper.map(error, new TransactionError(`Error sending transaction: ${error}`));
                    }
                }),
            sendUserOperation: ({ userOperation, middleware, account }) =>
                logPerformance("CrossmintSmartWallet.sendUserOperation", async () => {
                    try {
                        const params = {
                            userOperation: {
                                ...userOperation,
                                ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
                            },
                            middleware,
                            account,
                        };

                        logInfo(`[CrossmintSmartWallet.sendUserOperation] - params: ${params}`);
                        return smartAccountClient.sendUserOperation(params);
                    } catch (error) {
                        throw this.errorMapper.map(
                            error,
                            new TransactionError(`Error sending user operation: ${error}`)
                        );
                    }
                }),
        };
    }
}
