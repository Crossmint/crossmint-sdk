import type { ISdkLogger } from "./interfaces";
import type { LogContext, LogEntry, LogLevel, LogSink } from "./types";
import { generateSpanId, mergeContext, serializeLogArgs } from "./utils";
import { ConsoleSink, detectPlatform, type Platform } from "./index";
import { sinkManager } from "./sink-manager";
import type { APIKeyEnvironmentPrefix } from "../apiKey/types";
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
     * Current span context for tracing function execution.
     * When set, all logs will automatically include this context.
     * Used by withSpanContext() to provide span-based tracing.
     */
    private currentSpanContext: LogContext | undefined;

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
     * HOC-style context wrapper for tracing function execution with span-based tracing.
     *
     * - If a span is already active on this logger, runs `fn` without changing context
     *   to avoid stepping over the existing span.
     * - Otherwise, sets up a new span, runs `fn`, and restores the previous context
     *   even if `fn` throws or returns a rejected Promise.
     *
     * @param methodName - The name of the method being traced
     * @param additionalContext - Optional additional context to include in all logs
     * @param fn - The function to execute within the span context
     * @returns The result of the function execution
     */
    withSpanContext<T>(methodName: string, additionalContext: LogContext | undefined, fn: () => T): T {
        // If there is already a span, we stay out of the way to avoid stepping over the existing context
        if (this.currentSpanContext?.span_id != null) {
            return fn();
        }

        const previousContext = this.currentSpanContext;
        const spanId = generateSpanId();

        const spanContext: LogContext = {
            ...(previousContext ?? {}),
            span_id: spanId,
            method: methodName,
            ...(additionalContext ?? {}),
        };

        // Set new span context
        this.currentSpanContext = spanContext;

        let result: T;
        try {
            result = fn();
        } catch (err) {
            // Synchronous throw: cleanup and rethrow
            this.currentSpanContext = previousContext;
            throw err;
        }

        // If result is a Promise, restore context once it settles
        if (result && typeof (result as unknown as Promise<unknown>).then === "function") {
            const promise = result as unknown as Promise<unknown>;
            return promise.finally(() => {
                this.currentSpanContext = previousContext;
            }) as unknown as T;
        }

        // Non-promise result: restore immediately
        this.currentSpanContext = previousContext;
        return result;
    }

    /**
     * Get the current span ID if one is active
     */
    getCurrentSpanId(): string | undefined {
        return this.currentSpanContext?.span_id as string | undefined;
    }

    /**
     * Internal log method that handles serialization and sink writing
     */
    private log(level: LogLevel, message: unknown, ...rest: unknown[]): void {
        this.logWithContext(level, {}, message, ...rest);
    }

    /**
     * Internal log method with additional context support
     */
    private logWithContext(level: LogLevel, additionalContext: LogContext, message: unknown, ...rest: unknown[]): void {
        if (!this.initialized) {
            // Fallback to console if not initialized
            const fallbackMethod = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
            fallbackMethod("[SDK Logger not initialized]", message, ...rest);
            return;
        }

        // Serialize arguments into message and context
        const { message: serializedMessage, context: argsContext } = serializeLogArgs([message, ...rest]);

        // Merge global context with current span context, additional context, and argument context
        // The package name is set in globalContext during initialization
        // currentSpanContext is automatically included when withContext() is active
        const mergedContext = mergeContext(
            this.globalContext,
            this.currentSpanContext ?? {},
            additionalContext,
            argsContext
        );

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
