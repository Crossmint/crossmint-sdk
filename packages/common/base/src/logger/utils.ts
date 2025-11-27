import type { LogContext } from "./types";

/**
 * Merges multiple context objects, with later objects taking precedence
 */
export function mergeContext(...contexts: (LogContext | undefined)[]): LogContext {
    const merged: LogContext = {};
    for (const ctx of contexts) {
        if (ctx != null) {
            Object.assign(merged, ctx);
        }
    }
    return merged;
}

/**
 * Serializes mixed arguments into a message string and context object
 * Objects are merged into context, primitives are concatenated into message
 */
export function serializeLogArgs(args: unknown[]): { message: string; context: LogContext } {
    const messageParts: string[] = [];
    const context: LogContext = {};

    for (const arg of args) {
        if (arg == null) {
            messageParts.push(String(arg));
        } else if (arg instanceof Error) {
            // Error objects are serialized into context with their properties
            context.error = {
                name: arg.name,
                message: arg.message,
                stack: arg.stack,
            };
            // Also include error message in the log message
            messageParts.push(arg.message);
        } else if (typeof arg === "object") {
            // Merge objects into context
            Object.assign(context, arg);
        } else {
            // Primitives go into message
            messageParts.push(String(arg));
        }
    }

    return {
        message: messageParts.join(" "),
        context,
    };
}
