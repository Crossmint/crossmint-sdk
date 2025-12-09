import type { ISdkLogger } from "./interfaces";
import type { LogContext, LogEntry, LogLevel, LogSink } from "./types";
import { generateExecutionId, mergeContext, serializeLogArgs } from "./utils";
import { ConsoleSink, detectPlatform, type Platform } from "./index";
import { sinkManager } from "./sink-manager";
import type { APIKeyEnvironmentPrefix } from "../apiKey/types";

/**
 * Type guard to check if a value is a Promise-like object
 */
function isPromise(value: unknown): value is Promise<unknown> {
    return value != null && typeof (value as Promise<unknown>).then === "function";
}
/**
 * Simple initialization parameters for creating a logger
 */
export interface SdkLoggerInitParams {
    packageName?: string;
    packageVersion?: string;
    environment?: APIKeyEnvironmentPrefix;
    projectId?: string;
    platform?: Platform;
    additionalContext?: LogContext;
}

/**
 * Main SDK Logger implementation
 * Provides structured logging with context management and pluggable sinks
 * Each package should create its own instance with its package name
 */
export class SdkLogger implements ISdkLogger {
    private globalContext: LogContext = {};
    private initialized = false;

    /**
     * Current execution context for tracing function execution.
     * When set, all logs will automatically include this context.
     * Used by withExecutionContext() to provide execution-based tracing.
     */
    private currentExecutionContext: LogContext | undefined;

    /**
     * Create and initialize a logger with simple parameters
     * This is the recommended way to create a logger
     */
    constructor(params?: SdkLoggerInitParams) {
        if (params != null) {
            this.init(params);
        }
    }

    /**
     * Initialize the logger with package-specific context
     * Context is set via setContext() internally
     * Sinks should be added separately using addSink()
     */
    init(params: SdkLoggerInitParams): void {
        if (this.initialized) {
            this.warn("SdkLogger.init called multiple times. Ignoring subsequent calls.");
            return;
        }

        const platform = params.platform ?? detectPlatform();
        // Build base context
        const baseContext: LogContext = {
            sdk_version: params.packageVersion,
            sdk_name: params.packageName,
            platform,
            environment: params.environment,
            project_id: params.projectId,
            package: params.packageName,
            origin: "crossmint-sdk",
        };

        // Set context using setContext() method
        this.setContext(baseContext);
        if (params.additionalContext != null) {
            this.setContext(params.additionalContext);
        }

        // Initialize sink manager with console sink if not already initialized
        if (!sinkManager.isInitialized()) {
            sinkManager.init([new ConsoleSink()]);
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
     * HOC-style context wrapper for tracing function execution with execution-based tracing.
     *
     * - If an execution context is already active on this logger, runs `fn` without changing context
     *   to avoid stepping over the existing execution.
     * - Otherwise, sets up a new execution context, runs `fn`, and restores the previous context
     *   even if `fn` throws or returns a rejected Promise.
     *
     * @param methodName - The name of the method being traced
     * @param additionalContext - Optional additional context to include in all logs
     * @param fn - The function to execute within the execution context
     * @returns The result of the function execution
     */
    withExecutionContext<T>(methodName: string, additionalContext: LogContext | undefined, fn: () => T): T {
        // If there is already an execution context, we stay out of the way to avoid stepping over the existing context
        if (this.currentExecutionContext?.execution_id != null) {
            return fn();
        }

        const previousContext = this.currentExecutionContext;
        const executionId = generateExecutionId();

        const executionContext: LogContext = {
            ...(previousContext ?? {}),
            execution_id: executionId,
            method: methodName,
            ...(additionalContext ?? {}),
        };

        // Set new execution context
        this.currentExecutionContext = executionContext;

        let result: T;
        try {
            result = fn();
        } catch (err) {
            // Synchronous throw: cleanup and rethrow
            this.currentExecutionContext = previousContext;
            throw err;
        }

        // If result is a Promise, restore context once it settles
        if (isPromise(result)) {
            return result.finally(() => {
                this.currentExecutionContext = previousContext;
            }) as unknown as T;
        }

        // Non-promise result: restore immediately
        this.currentExecutionContext = previousContext;
        return result;
    }

    /**
     * Get the current execution ID if one is active
     */
    getCurrentExecutionId(): string | undefined {
        return this.currentExecutionContext?.execution_id as string | undefined;
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

        // Merge global context with current execution context and argument context
        // The package name is set in globalContext during initialization
        // currentExecutionContext is automatically included when withExecutionContext() is active
        const mergedContext = mergeContext(this.globalContext, this.currentExecutionContext ?? {}, argsContext);

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
