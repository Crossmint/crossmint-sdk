import { SmartWalletSDKError } from "@/error";
import { ErrorProcessor } from "@/error/processor";
import { logInfo } from "@/services/logging";
import { usesGelatoBundler } from "@/utils/blockchain";
import { logPerformance } from "@/utils/log";
import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { stringify } from "viem";

import { SmartWalletChain } from "../chains";

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

/**
 * A decorator class for SmartAccountClient instances. It enhances the client with:
 * - Error handling & logging.
 * - Performance metrics.
 * - Automatic formatting of transactions for Gelato bundler compatibility.
 *  */
export class ClientDecorator {
    constructor(private readonly errorProcessor: ErrorProcessor) {}

    public decorate<Client extends SmartAccountClient<EntryPoint>>({
        crossmintChain,
        smartAccountClient,
    }: {
        crossmintChain: SmartWalletChain;
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
        crossmintChain: SmartWalletChain
    ) {
        try {
            logInfo(`[CrossmintSmartWallet.${prop}] - params: ${stringify(args)}`);
            const processed = isTxnMethod(prop) ? this.processTxnArgs(prop, crossmintChain, args) : args;
            return await originalMethod.call(target, ...processed);
        } catch (error: any) {
            const description = isTxnMethod(prop) ? "signing" : "sending transaction";
            throw this.errorProcessor.map(
                error,
                new SmartWalletSDKError(`Error ${description}: ${error.message}`, stringify(error))
            );
        }
    }

    private processTxnArgs(prop: TxnMethod, crossmintChain: SmartWalletChain, args: any[]): any[] {
        if (prop === "sendUserOperation") {
            const [{ userOperation, middleware, account }] = args as Parameters<
                SmartAccountClient<EntryPoint>["sendUserOperation"]
            >;
            return [
                {
                    middleware,
                    account,
                    userOperation: this.addGelatoBundlerProperties(crossmintChain, userOperation),
                },
                ...args.slice(1),
            ];
        }

        const [txn] = args as
            | Parameters<SmartAccountClient<EntryPoint>["sendTransaction"]>
            | Parameters<SmartAccountClient<EntryPoint>["writeContract"]>;

        return [this.addGelatoBundlerProperties(crossmintChain, txn), ...args.slice(1)];
    }

    /*
     * Chain that ZD uses Gelato as for bundler require special parameters:
     * https://docs.zerodev.app/sdk/faqs/use-with-gelato#transaction-configuration
     */
    private addGelatoBundlerProperties(
        crossmintChain: SmartWalletChain,
        txnParams: { maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }
    ) {
        if (usesGelatoBundler(crossmintChain)) {
            return { ...txnParams, maxFeePerGas: "0x0" as any, maxPriorityFeePerGas: "0x0" as any };
        }

        return txnParams;
    }
}
