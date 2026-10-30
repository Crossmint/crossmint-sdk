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
    "derivedkeybytes",
    "secretkey",
    "keypair",
]);

const MAX_REDACTION_DEPTH = 10;

/**
 * Shapes of secret material that can end up inside free text (error messages, stack traces,
 * interpolated log messages), where key-based redaction cannot see them.
 * - Server signer master secrets: `xmsk1_` + 64 hex chars.
 * - JWTs: three base64url segments, the first one starting with `eyJ`.
 * - Crossmint API keys: `sk_`/`ck_` + environment + payload.
 * Every pattern is anchored to a delimiter so a long run of look-alike characters is scanned once
 * (linear time): the scrubbed text can come from an untrusted API response.
 * Lookbehind is avoided on purpose: some JS engines the SDK runs on reject it at parse time.
 */
const PREFIXED_SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /xmsk1_[0-9a-fA-F]{64}/g, replacement: "xmsk1_[REDACTED]" },
    { pattern: /(^|[^A-Za-z0-9_-])eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: "$1[REDACTED]" },
    {
        pattern: /(^|[^0-9a-zA-Z])[sc]k_(?:development|staging|production|live|test)_[A-Za-z0-9]+/g,
        replacement: "$1[REDACTED]",
    },
];

/**
 * A server signer master secret is also accepted without its `xmsk1_` prefix, as a bare 64-char hex
 * string. That shape is shared with legitimate observability data (Stellar transaction hashes,
 * SHA-256 digests) that the SDK logs as structured context fields, so it is only scrubbed from
 * free text. `0x`-prefixed hex (EVM transaction hashes) is left alone for the same reason.
 */
const BARE_HEX_SECRET_PATTERN = {
    pattern: /(^|[^0-9a-zA-Z])[0-9a-fA-F]{64}(?![0-9a-zA-Z])/g,
    replacement: "$1[REDACTED]",
};

/**
 * Replaces known secret shapes inside a string with a placeholder.
 * Complements {@link redactSensitiveFields}, which only redacts by object key: an Error whose
 * message embeds a secret would otherwise reach every sink unchanged.
 *
 * @param text - The text to scrub
 * @param freeText - true for prose that may embed any value (log messages, error messages and
 *   stacks), which also scrubs bare 64-char hex; false for structured context fields
 */
export function redactSensitiveText(text: string, freeText: boolean): string {
    const patterns = freeText ? [...PREFIXED_SECRET_PATTERNS, BARE_HEX_SECRET_PATTERN] : PREFIXED_SECRET_PATTERNS;
    let redacted = text;
    for (const { pattern, replacement } of patterns) {
        redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
}

/**
 * Truncates a string value for redacted output, showing first and last 4 chars.
 * For short strings (<=20 chars), returns '[REDACTED]'.
 */
function redactValue(value: unknown): string {
    if (typeof value === "string" && value.length > 20) {
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
    if (typeof obj === "string") {
        return redactSensitiveText(obj, false);
    }
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
            message: redactSensitiveText(obj.message, true),
            stack: obj.stack == null ? obj.stack : redactSensitiveText(obj.stack, true),
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
            // Error objects are serialized into context with their properties.
            // Their text is scrubbed here: once it is a plain string it is no longer recognizable as free text.
            context.error = {
                name: arg.name,
                message: redactSensitiveText(arg.message, true),
                stack: arg.stack == null ? arg.stack : redactSensitiveText(arg.stack, true),
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
