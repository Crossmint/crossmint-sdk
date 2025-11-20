import type { LogContext, LogEntry, LogSink } from "../types";

/**
 * Console sink that writes logs to the console
 * Works in browser, React Native, and Node.js environments
 */
export class ConsoleSink implements LogSink {
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
                return console.error;
            default:
                return console.log;
        }
    }

    private formatMessage(message: string, context: LogContext): string {
        if (message === "" && Object.keys(context).length > 0) {
            // If no message but has context, create a message from context
            return `[SDK] ${JSON.stringify(context)}`;
        }
        return message !== "" ? `[SDK] ${message}` : "[SDK]";
    }
}
