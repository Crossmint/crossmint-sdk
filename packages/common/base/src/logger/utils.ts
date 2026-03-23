import type { LogContext } from "./types";

/**
 * Set of keys whose values should be redacted from log output.
 * Keys are matched case-insensitively against object property names.
 */
const SENSITIVE_KEYS = new Set([
    "jwt",
    "apikey",
    "api_key",
    "authorization",
    "x-api-key",
    "accesstoken",
    "access_token",
    "authtoken",
    "auth_token",
    "bearertoken",
    "bearer_token",
    "idtoken",
    "id_token",
    "refreshtoken",
    "refresh_token",
    "secret",
    "client_secret",
    "password",
    "privatekey",
    "private_key",
    "credential",
    "authdata",
    "bearer",
]);

const MAX_REDACTION_DEPTH = 10;

/**
 * Truncates a string value for redacted output, showing first and last 4 chars.
 * For short strings (<=8 chars), returns '[REDACTED]'.
 */
function redactValue(value: unknown): string {
    if (typeof value === "string" && value.length > 8) {
        return `${value.slice(0, 4)}...${value.slice(-4)}`;
    }
    return "[REDACTED]";
}

/**
 * Recursively redacts known-sensitive fields from an object before logging.
 * This is a defense-in-depth measure to prevent credentials (JWTs, API keys, etc.)
 * from appearing in console output or external log sinks.
 *
 * @param obj - The value to redact
 * @param depth - Current recursion depth (capped at MAX_REDACTION_DEPTH)
 * @returns A new object with sensitive fields replaced by redacted placeholders
 */
export function redactSensitiveFields(obj: unknown, depth = 0): unknown {
    if (depth > MAX_REDACTION_DEPTH || obj == null || typeof obj !== "object") {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => redactSensitiveFields(item, depth + 1));
    }

    // Error instances have non-enumerable properties (name, message, stack);
    // preserve them explicitly so error observability is not lost.
    if (obj instanceof Error) {
        return {
            name: obj.name,
            message: obj.message,
            stack: obj.stack,
            ...(redactSensitiveFields(Object.fromEntries(Object.entries(obj)), depth + 1) as object),
        };
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(key.toLowerCase())) {
            result[key] = redactValue(value);
        } else {
            result[key] = redactSensitiveFields(value, depth + 1);
        }
    }
    return result;
}

/**
 * Generates a unique execution ID for tracing function execution
 * Uses a combination of timestamp and random characters for uniqueness
 */
export function generateExecutionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${randomPart}`;
}

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
