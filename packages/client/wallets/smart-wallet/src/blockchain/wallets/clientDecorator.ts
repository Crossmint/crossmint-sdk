import type { SmartAccountClient } from "permissionless";
import type { EntryPoint } from "permissionless/types/entrypoint";
import { stringify } from "viem";

import { SmartWalletError } from "../../error";
import type { ErrorProcessor } from "../../error/processor";
import { scwLogger } from "../../services";
import type { SmartWalletChain } from "../chains";

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
    constructor(
        private readonly errorProcessor: ErrorProcessor,
        protected logger = scwLogger
    ) {}

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
                    this.logger.logPerformance(`CrossmintSmartWallet.${prop}`, () =>
                        this.execute(target, prop, originalMethod, args, crossmintChain)
                    );
            },
        }) as Client;
    }

    private async execute<M extends TxnMethod | SignMethod>(
        target: SmartAccountClient<EntryPoint>,
        prop: M,
        originalMethod: Function,
        args: any[],
        crossmintChain: SmartWalletChain
    ) {
        try {
            this.logger.log(`[CrossmintSmartWallet.${prop}] - params: ${stringify(args)}`);
            const processed = isTxnMethod(prop) ? this.processTxnArgs(prop, crossmintChain, args) : args;
            return await originalMethod.call(target, ...processed);
        } catch (error: any) {
            const description = isTxnMethod(prop) ? "signing" : "sending transaction";
            throw this.errorProcessor.map(
                error,
                new SmartWalletError(`Error ${description}: ${error.message}`, stringify(error))
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
                    userOperation,
                },
                ...args.slice(1),
            ];
        }

        const [txn] = args as
            | Parameters<SmartAccountClient<EntryPoint>["sendTransaction"]>
            | Parameters<SmartAccountClient<EntryPoint>["writeContract"]>;

        return [txn, ...args.slice(1)];
    }
}
