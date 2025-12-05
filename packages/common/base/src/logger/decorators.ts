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
     * Optional custom method name (defaults to ClassName.methodName)
     */
    methodName?: string;

    /**
     * Optional function to build additional context from the method's this and arguments
     */
    buildContext?: ContextBuilder<T>;
}

/**
 * Decorator for public SDK methods that wraps them with logger span context.
 *
 * This decorator:
 * - Wraps the method execution with logger.withSpanContext()
 * - Automatically generates a span ID for tracing
 * - Checks if there's already an active span to avoid stepping over existing context
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
 *         // Method body - logs will automatically include span_id and method context
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

        const methodNameFromKey = `${(target as { constructor: { name: string } }).constructor.name}.${String(propertyKey)}`;
        const methodName = options.methodName ?? methodNameFromKey;

        const wrapped = function (this: TThis, ...args: unknown[]): unknown {
            const ctx = options.buildContext ? options.buildContext(this, args) : {};
            // Delegate span lifecycle to logger.withSpanContext
            return options.logger.withSpanContext(methodName, ctx, () => original.apply(this, args));
        };

        // The cast confines unsafety to the decorator implementation
        descriptor.value = wrapped as typeof descriptor.value;
        return descriptor;
    };
}
