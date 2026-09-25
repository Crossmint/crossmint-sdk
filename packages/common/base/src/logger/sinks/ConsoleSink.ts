import type { ConsoleLogLevel, LogContext, LogEntry, LogLevel, LogSink } from "../types";

/**
 * Log level hierarchy for filtering
 * Lower index = less severe, higher index = more severe
 */
const LOG_LEVEL_HIERARCHY: LogLevel[] = ["debug", "info", "warn", "error"];

function serializeContext(context: LogContext): string {
    const seen = new WeakSet<object>();
    return JSON.stringify(context, (_key, value: unknown) => {
        if (typeof value === "bigint") {
            return value.toString();
        }
        if (value instanceof Error) {
            return { name: value.name, message: value.message, stack: value.stack };
        }
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return "[Circular]";
            }
            seen.add(value);
        }
        return value;
    });
}

/**
 * Console sink that writes logs to the console
 * Works in browser, React Native, and Node.js environments
 * Supports filtering logs by minimum log level
 */
export class ConsoleSink implements LogSink {
    readonly id = "console";

    constructor(private minLogLevel: ConsoleLogLevel = "debug") {}

    write(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) {
            return;
        }
        const { level, message, context } = entry;
        this.getConsoleMethod(level)(this.formatMessage(message, context));
    }

    private getConsoleMethod(level: LogEntry["level"]): typeof console.log {
        switch (level) {
            case "debug":
                return console.debug;
            case "info":
                return console.info;
            case "warn":
                return console.warn;
            case "error":
                // In development, use console.warn instead of console.error to avoid
                // React DevTools showing these logs as errors in the error overlay,
                // which can be confusing for developers. In production, use console.error
                // for proper error tracking and monitoring.
                return this.isProduction() ? console.error : console.warn;
            default:
                return console.log;
        }
    }

    private isProduction(): boolean {
        return typeof process !== "undefined" && process.env != null && process.env.NODE_ENV === "production";
    }

    /**
     * Emits a single self-contained string: text-based console consumers (Playwright, Sentry
     * breadcrumbs, log shippers) only see the first argument, so context passed as a separate
     * argument would surface as "JSHandle@object" and the payload would be lost.
     */
    private formatMessage(message: string, context: LogContext): string {
        const parts = ["[SDK]"];
        if (message !== "") {
            parts.push(message);
        }
        if (Object.keys(context).length > 0) {
            parts.push(serializeContext(context));
        }
        return parts.join(" ");
    }

    private shouldLog(level: LogLevel): boolean {
        if (this.minLogLevel === "silent") {
            return false;
        }
        const entryLevelIndex = LOG_LEVEL_HIERARCHY.indexOf(level);
        const minLevelIndex = LOG_LEVEL_HIERARCHY.indexOf(this.minLogLevel);
        return entryLevelIndex >= minLevelIndex;
    }
}
