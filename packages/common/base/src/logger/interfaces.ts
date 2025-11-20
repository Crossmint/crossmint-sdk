import type { LogContext, LogSink } from "./types";

/**
 * Initialization options for the SDK Logger
 */
export interface SdkLoggerInitOptions {
    /**
     * Array of sinks to write logs to (e.g., console, Datadog)
     */
    sinks: LogSink[];
    /**
     * Base context to attach to all logs (e.g., sdk_version, platform, package)
     */
    context?: LogContext;
}

/**
 * Main SDK Logger interface
 */
export interface ISdkLogger {
    /**
     * One-time initialization: configure sinks + base context
     */
    init(opts: SdkLoggerInitOptions): void;

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     */
    addSink(sink: LogSink): void;

    /**
     * Set/extend global context (applies to all future logs)
     */
    setContext(ctx: LogContext): void;

    /**
     * Run a function with a temporary context (e.g., request/session)
     */
    withContext<T>(ctx: LogContext, fn: () => T): T;

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
