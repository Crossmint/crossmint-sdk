import type { LogContext } from "./types";
import type { SdkLogger } from "./SdkLogger";

/**
 * Function type for building context from method arguments
 */
export type ContextBuilder<T = unknown> = (thisArg: T, args: unknown[]) => LogContext;

/**
 * Options for the WithLoggerContext decorator
 */
export interface WithLoggerContextOptions<T = unknown> {
    /**
     * The logger instance to use for logging
     */
    logger: SdkLogger;

    /**
     * The method name to use for logging context (required to avoid minification issues)
     */
    methodName: string;

    /**
     * Optional function to build additional context from the method's this and arguments
     */
    buildContext?: ContextBuilder<T>;
}

/**
 * Decorator for public SDK methods that wraps them with logger execution context.
 *
 * This decorator:
 * - Wraps the method execution with logger.withExecutionContext()
 * - Automatically generates an execution ID for tracing
 * - Checks if there's already an active execution context to avoid stepping over existing context
 * - Properly handles both sync and async methods
 *
 * @example
 * ```typescript
 * class Wallet {
 *     @WithLoggerContext({
 *         logger: walletsLogger,
 *         methodName: "wallet.send",
 *         buildContext(thisArg, [to, token, amount]) {
 *             return { chain: thisArg.chain, address: thisArg.address, to, token, amount };
 *         },
 *     })
 *     public async send(to: string, token: string, amount: string): Promise<Transaction> {
 *         // Method body - logs will automatically include execution_id and method context
 *         walletsLogger.info("wallet.send.start");
 *         // ...
 *     }
 * }
 * ```
 */
export function WithLoggerContext<TThis = unknown>(options: WithLoggerContextOptions<TThis>): MethodDecorator {
    return function (target, propertyKey, descriptor) {
        const original = descriptor.value as ((...args: unknown[]) => unknown) | undefined;

        if (original == null) {
            return descriptor;
        }

        const wrapped = function (this: TThis, ...args: unknown[]): unknown {
            const ctx = options.buildContext ? options.buildContext(this, args) : {};
            // Delegate execution lifecycle to logger.withExecutionContext
            return options.logger.withExecutionContext(options.methodName, ctx, () => original.apply(this, args));
        };

        // The cast confines unsafety to the decorator implementation
        descriptor.value = wrapped as typeof descriptor.value;
        return descriptor;
    };
}
