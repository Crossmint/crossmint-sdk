import type { LogContext, LogEntry, LogSink } from "../types";

/**
 * Console sink that writes logs to the console
 * Works in browser, React Native, and Node.js environments
 */
export class ConsoleSink implements LogSink {
    readonly id = "console";

    write(entry: LogEntry): void {
        const { level, message, context } = entry;
        const logMethod = this.getConsoleMethod(level);

        // Format the log message with context
        const formattedMessage = this.formatMessage(message, context);

        // Use appropriate console method
        if (Object.keys(context).length > 0) {
            logMethod(formattedMessage, context);
        } else {
            logMethod(formattedMessage);
        }
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

    private formatMessage(message: string, context: LogContext): string {
        if (message === "" && Object.keys(context).length > 0) {
            // If no message but has context, create a message from context
            return `[SDK] ${JSON.stringify(context)}`;
        }
        return message !== "" ? `[SDK] ${message}` : "[SDK]";
    }
}
