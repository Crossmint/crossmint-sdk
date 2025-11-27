import type { ISdkLogger, SdkLoggerInitOptions } from "./interfaces";
import type { LogContext, LogEntry, LogLevel, LogSink } from "./types";
import { mergeContext, serializeLogArgs } from "./utils";
import { sinkManager } from "./sink-manager";

/**
 * Main SDK Logger implementation
 * Provides structured logging with context management and pluggable sinks
 * Each package should create its own instance with its package name
 */
export class SdkLogger implements ISdkLogger {
    private globalContext: LogContext = {};
    private initialized = false;

    /**
     * Initialize the logger with package-specific context
     * Sinks are shared via the global sink manager
     * @param opts - Initialization options including package-specific context
     */
    init(opts: SdkLoggerInitOptions): void {
        if (this.initialized) {
            this.warn("SdkLogger.init called multiple times. Ignoring subsequent calls.");
            return;
        }

        // Initialize sink manager if not already initialized
        if (!sinkManager.isInitialized()) {
            sinkManager.init(opts.sinks);
        } else {
            // If sink manager is already initialized, add any new sinks
            for (const sink of opts.sinks) {
                sinkManager.addSink(sink);
            }
        }

        if (opts.context != null) {
            this.globalContext = { ...opts.context };
        }
        this.initialized = true;
    }

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     * The sink is added to the shared sink manager
     */
    addSink(sink: LogSink): void {
        if (!this.initialized) {
            console.warn("[SdkLogger] Cannot add sink before initialization. Call init() first.");
            return;
        }
        sinkManager.addSink(sink);
    }

    /**
     * Set/extend global context (applies to all future logs)
     */
    setContext(ctx: LogContext): void {
        this.globalContext = mergeContext(this.globalContext, ctx);
    }

    /**
     * Run a function with a temporary context (e.g., request/session)
     * The context is only active during the function execution
     */
    withContext<T>(ctx: LogContext, fn: () => T): T {
        const previousContext = { ...this.globalContext };
        this.globalContext = mergeContext(this.globalContext, ctx);
        try {
            return fn();
        } finally {
            this.globalContext = previousContext;
        }
    }

    /**
     * Log a debug message
     */
    debug(message: unknown, ...rest: unknown[]): void {
        this.log("debug", message, ...rest);
    }

    /**
     * Log an info message
     */
    info(message: unknown, ...rest: unknown[]): void {
        this.log("info", message, ...rest);
    }

    /**
     * Log a warning message
     */
    warn(message: unknown, ...rest: unknown[]): void {
        this.log("warn", message, ...rest);
    }

    /**
     * Log an error message
     */
    error(message: unknown, ...rest: unknown[]): void {
        this.log("error", message, ...rest);
    }

    /**
     * Internal log method that handles serialization and sink writing
     */
    private log(level: LogLevel, message: unknown, ...rest: unknown[]): void {
        if (!this.initialized) {
            // Fallback to console if not initialized
            const fallbackMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
            fallbackMethod("[SDK Logger not initialized]", message, ...rest);
            return;
        }

        // Serialize arguments into message and context
        const { message: serializedMessage, context: argsContext } = serializeLogArgs([message, ...rest]);

        // Merge global context with argument context
        // The package name is set in globalContext during initialization
        const mergedContext = mergeContext(this.globalContext, argsContext);

        // Create log entry
        const entry: LogEntry = {
            level,
            message: serializedMessage,
            context: mergedContext,
            timestamp: Date.now(),
        };

        // Write to all shared sinks
        const sinks = sinkManager.getSinks();
        for (const sink of sinks) {
            try {
                sink.write(entry);
            } catch (error) {
                // Don't let sink errors break the application
                // Use console.error as last resort (not the sink)
                console.error("[SdkLogger] Error writing to sink:", error);
            }
        }
    }
}
