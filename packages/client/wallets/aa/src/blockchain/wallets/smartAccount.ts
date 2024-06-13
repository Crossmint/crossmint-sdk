import { logInfo } from "@/services/logging";
import { gelatoBundlerProperties, usesGelatoBundler } from "@/utils";
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
            return logPerformance("CrossmintSmartWallet.signMessage", async () => {
                try {
                    return await smartAccountClient.signMessage(args);
                } catch (error) {
                    throw new Error(`Error signing message. If this error persists, please contact support.`);
                }
            });
        },
        async signTypedData(data) {
            return logPerformance("CrossmintSmartWallet.signTypedData", async () => {
                try {
                    return await smartAccountClient.signTypedData(data);
                } catch (error) {
                    throw new Error(`Error signing typed data. If this error persists, please contact support.`);
                }
            });
        },
        async sendTransaction(txn) {
            txn = {
                ...txn,
                ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
            };
            logInfo(`[CrossmintSmartWallet.sendTransaction] - params: ${JSON.stringify(txn)}`);
            return smartAccountClient.sendTransaction(txn);
        },
        async sendUserOperation({ userOperation, middleware, account }) {
            userOperation = {
                ...userOperation,
                ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
            };

            logInfo(`[CrossmintSmartWallet.sendUserOperation] - params: ${{ userOperation, middleware, account }}`);
            return smartAccountClient.sendUserOperation({ userOperation, middleware, account });
        },
    };
}
