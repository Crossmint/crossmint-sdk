import { SmartWalletSDKError, TransactionError } from "@/error";
import { ErrorMapper } from "@/error/mapper";
import { logInfo } from "@/services/logging";
import type { SignerData } from "@/types/API";
import { gelatoBundlerProperties, usesGelatoBundler } from "@/utils/blockchain";
import { logPerformance } from "@/utils/log";
import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { stringify } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export class AccountClientDecorator {
    constructor(private readonly errorMapper: ErrorMapper) {}

    public decorate<Client extends SmartAccountClient<EntryPoint>>({
        crossmintChain,
        smartAccountClient,
    }: {
        crossmintChain: EVMBlockchainIncludingTestnet;
        signerData: SignerData;
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
                                "Error signing typed data. If this error persists, please contact support."
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

                        logInfo(`[CrossmintSmartWallet.sendTransaction] - params: ${stringify(txn)}`);
                        return await smartAccountClient.sendTransaction(txn);
                    } catch (error) {
                        throw this.errorMapper.map(error, new TransactionError(`Error sending transaction: ${error}`));
                    }
                }),
            writeContract: (txn) =>
                logPerformance("CrossmintSmartWallet.writeContract", async () => {
                    try {
                        txn = {
                            ...txn,
                            ...(usesGelatoBundler(crossmintChain) && gelatoBundlerProperties),
                        };

                        logInfo(`[CrossmintSmartWallet.writeContract] - params: ${stringify(txn)}`);
                        return await smartAccountClient.writeContract(txn);
                    } catch (error) {
                        throw this.errorMapper.map(error, new TransactionError(`Error writing to contract: ${error}`));
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

                        logInfo(`[CrossmintSmartWallet.sendUserOperation] - params: ${stringify(params)}`);
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
