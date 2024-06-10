import { logInfo } from "@/services/logging";
import { TransactionError, gelatoBundlerProperties, usesGelatoBundler } from "@/utils";
import { logPerformance } from "@/utils/log";
import { SmartAccountClient } from "permissionless";
import { EntryPoint } from "permissionless/types/entrypoint";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export function toCrossmintSmartAccountClient<Client extends SmartAccountClient<EntryPoint>>({
    crossmintChain,
    smartAccountClient,
}: {
    crossmintChain: EVMBlockchainIncludingTestnet;
    smartAccountClient: Client;
}): Client {
    return {
        ...smartAccountClient,
        async signMessage(args) {
            try {
                return await smartAccountClient.signMessage(args);
            } catch (error) {
                throw new Error(`Error signing message. If this error persists, please contact support.`);
            }
        },
        async signTypedData(data) {
            try {
                return smartAccountClient.signTypedData(data);
            } catch (error) {
                throw new Error(`Error signing typed data. If this error persists, please contact support.`);
            }
        },
        async sendTransaction(txn) {
            return logPerformance("CrossmintSmartWallet.sendTransaction", async () => {
                try {
                    txn = {
                        ...txn,
                        ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
                    };

                    logInfo(`[CrossmintSmartWallet.sendTransaction] - params: ${JSON.stringify(txn)}`);
                    return await smartAccountClient.sendTransaction(txn);
                } catch (error) {
                    throw new TransactionError(`Error sending transaction: ${error}`);
                }
            });
        },
        async sendUserOperation({ userOperation, middleware, account }) {
            return logPerformance("CrossmintSmartWallet.sendUserOperation", async () => {
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
            });
        },
    };
}
