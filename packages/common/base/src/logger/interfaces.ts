import type { LogContext, LogSink } from "./types";
import type { SdkLoggerInitParams } from "./SdkLogger";

/**
 * Scoped logger interface for context-aware logging
 * Created by withContext() to provide logging with additional context (e.g., span ID)
 */
export interface IScopedLogger {
    /**
     * Log a debug message with scoped context
     */
    debug(message: unknown, ...rest: unknown[]): void;

    /**
     * Log an info message with scoped context
     */
    info(message: unknown, ...rest: unknown[]): void;

    /**
     * Log a warning message with scoped context
     */
    warn(message: unknown, ...rest: unknown[]): void;

    /**
     * Log an error message with scoped context
     */
    error(message: unknown, ...rest: unknown[]): void;

    /**
     * Get the span ID for this scoped logger
     */
    spanId: string;
}

/**
 * Main SDK Logger interface
 */
export interface ISdkLogger {
    /**
     * One-time initialization: configure base context
     * Sinks should be added separately using addSink()
     */
    init(params: SdkLoggerInitParams): void;

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     */
    addSink(sink: LogSink): void;

    /**
     * Set/extend global context (applies to all future logs)
     */
    setContext(ctx: LogContext): void;

    /**
     * Log a debug message
     */
    debug(message: unknown, ...rest: unknown[]): void;

    /**
     * Log an info message
     */
    info(message: unknown, ...rest: unknown[]): void;

    /**
     * Log a warning message
     */
    warn(message: unknown, ...rest: unknown[]): void;

    /**
     * Log an error message
     */
    error(message: unknown, ...rest: unknown[]): void;
}
