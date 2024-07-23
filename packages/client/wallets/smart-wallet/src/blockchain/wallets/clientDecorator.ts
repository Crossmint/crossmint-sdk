import { SmartWalletSDKError, TransactionError } from "@/error";
import { ErrorBoundary } from "@/error/boundary";
import { logInfo } from "@/services/logging";
import { usesGelatoBundler } from "@/utils/blockchain";
import { logPerformance } from "@/utils/log";
import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { stringify } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

const transactionMethods = [
    "sendTransaction",
    "writeContract",
    "sendUserOperation",
] as const satisfies readonly (keyof SmartAccountClient<EntryPoint>)[];

const signingMethods = [
    "signMessage",
    "signTypedData",
] as const satisfies readonly (keyof SmartAccountClient<EntryPoint>)[];

type TxnMethod = (typeof transactionMethods)[number];
type SignMethod = (typeof signingMethods)[number];

function isTxnMethod(method: string): method is TxnMethod {
    return transactionMethods.includes(method as any);
}

function isSignMethod(method: string): method is SignMethod {
    return signingMethods.includes(method as any);
}

/*
 * Chain that ZD uses Gelato as for bundler require special parameters:
 * https://docs.zerodev.app/sdk/faqs/use-with-gelato#transaction-configuration
 */
const gelatoBundlerProperties = {
    maxFeePerGas: "0x0" as any,
    maxPriorityFeePerGas: "0x0" as any,
};

/**
 * A decorator class for SmartAccountClient instances. It enhances the client with:
 * - Error handling & logging.
 * - Performance metrics.
 * - Automatic formatting of transactions for Gelato bundler compatibility.
 *  */
export class ClientDecorator {
    constructor(private readonly errorBoundary: ErrorBoundary) {}

    public decorate<Client extends SmartAccountClient<EntryPoint>>({
        crossmintChain,
        smartAccountClient,
    }: {
        crossmintChain: EVMBlockchainIncludingTestnet;
        smartAccountClient: Client;
    }): Client {
        return new Proxy(smartAccountClient, {
            get: (target, prop, receiver) => {
                const originalMethod = Reflect.get(target, prop, receiver);

                if (
                    typeof originalMethod !== "function" ||
                    typeof prop !== "string" ||
                    !(isSignMethod(prop) || isTxnMethod(prop))
                ) {
                    return originalMethod;
                }

                return (...args: any[]) =>
                    logPerformance(`CrossmintSmartWallet.${prop}`, () =>
                        this.execute(target, prop, originalMethod, args, crossmintChain)
                    );
            },
        }) as Client;
    }

    private async execute<M extends TxnMethod | SignMethod>(
        target: SmartAccountClient<EntryPoint>,
        prop: M,
        // eslint-disable-next-line @typescript-eslint/ban-types
        originalMethod: Function,
        args: any[],
        crossmintChain: EVMBlockchainIncludingTestnet
    ) {
        try {
            logInfo(`[CrossmintSmartWallet.${prop}] - params: ${stringify(args)}`);
            const processedArgs = isTxnMethod(prop) ? this.formatTransaction(prop, crossmintChain, args) : args;
            return await originalMethod.call(target, processedArgs);
        } catch (error) {
            const fallback = isTxnMethod(prop)
                ? new TransactionError(`Error sending transaction: ${error}`)
                : new SmartWalletSDKError("Error signing. If this error persists, please contact support.");
            return this.errorBoundary.map(error, fallback);
        }
    }

    private formatTransaction(prop: TxnMethod, crossmintChain: EVMBlockchainIncludingTestnet, args: any) {
        if (prop === "sendUserOperation") {
            const [{ userOperation, middleware, account }] = args as Parameters<
                SmartAccountClient<EntryPoint>["sendUserOperation"]
            >;
            return {
                userOperation: this.addGelatoBundlerProperties(crossmintChain, userOperation),
                middleware,
                account,
            };
        }

        return this.addGelatoBundlerProperties(crossmintChain, args[0]);
    }

    private addGelatoBundlerProperties(crossmintChain: EVMBlockchainIncludingTestnet, txn: any) {
        if (usesGelatoBundler(crossmintChain)) {
            return { ...txn, ...gelatoBundlerProperties };
        }
        return txn;
    }
}
