/**
 * Log level enum
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Context object that can be attached to logs
 */
export interface LogContext {
    [key: string]: unknown;
}

/**
 * Log entry structure
 */
export interface LogEntry {
    level: LogLevel;
    message: string;
    context: LogContext;
    timestamp: number;
}

/**
 * Sink interface for log output destinations
 */
export interface LogSink {
    /**
     * Unique identifier for the sink
     * Used to prevent duplicate sinks from being added
     */
    id: string;
    /**
     * Write a log entry to the sink
     */
    write(entry: LogEntry): void;
    /**
     * Flush any pending logs to the destination
     * This is optional - sinks that don't buffer logs don't need to implement this
     */
    flush?(): Promise<void> | void;
}
