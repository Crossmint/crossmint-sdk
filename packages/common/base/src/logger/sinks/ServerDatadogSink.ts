import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry, LogSink } from "../types";
import { DATADOG_CLIENT_TOKEN, type DatadogSinkLoggerOptions } from "../init-helpers";

/**
 * Generates a trace ID for log correlation
 * Singleton trace ID generated once per SDK instance
 */
function generateTraceId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID != null) {
        // Use crypto.randomUUID() and convert to hex format (64-bit for Datadog)
        const uuid = crypto.randomUUID().replace(/-/g, "");
        // Take first 16 characters for 64-bit trace ID
        return uuid.substring(0, 16);
    }
    // Fallback for environments without crypto.randomUUID
    const chars = "0123456789abcdef";
    let result = "";
    for (let i = 0; i < 16; i++) {
        result += chars[Math.floor(Math.random() * 16)];
    }
    return result;
}

// Singleton trace ID - generated once when module loads
// All logs from this sink instance will share the same trace ID for correlation
const TRACE_ID = generateTraceId();
const SPAN_ID = generateTraceId();

/**
 * Server/Node.js implementation of Datadog sink
 * Uses HTTP API to send logs to Datadog
 *
 * This implementation sends logs directly to Datadog's HTTP intake endpoint
 * without requiring additional dependencies (uses native fetch in Node.js 18+)
 */
export class ServerDatadogSink implements DatadogSink {
    private initialized = false;
    private options: DatadogSinkOptions;
    private intakeUrl: string;
    private batchQueue: LogEntry[] = [];
    private batchTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds

    constructor(options: DatadogSinkOptions) {
        this.options = options;
        this.intakeUrl = "https://telemetry.crossmint.com/dd";
    }

    initialize(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
    }

    write(entry: LogEntry): void {
        if (!this.initialized) {
            this.initialize();
        }

        // Add to batch queue
        this.batchQueue.push(entry);

        // Flush if batch is full
        if (this.batchQueue.length >= this.BATCH_SIZE) {
            this.flush();
        } else {
            // Schedule flush after timeout
            if (this.batchTimeout == null) {
                this.batchTimeout = setTimeout(() => {
                    this.flush();
                }, this.BATCH_TIMEOUT_MS);
            }
        }
    }

    private async flush(): Promise<void> {
        if (this.batchQueue.length === 0) {
            return;
        }

        const batch = this.batchQueue.splice(0, this.BATCH_SIZE);
        if (this.batchTimeout != null) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        try {
            // Format logs for Datadog HTTP intake
            const logs = batch.map((entry) => ({
                ddsource: "crossmint-sdk",
                ddtags: `env:${this.options.env ?? "production"},service:${this.options.service ?? "crossmint-sdk"},version:${this.options.version ?? "unknown"}`,
                hostname: typeof process !== "undefined" ? process.env.HOSTNAME ?? "unknown" : "unknown",
                message: entry.message,
                service: this.options.service ?? "crossmint-sdk",
                status: this.mapLevelToStatus(entry.level),
                timestamp: entry.timestamp,
                "dd.trace_id": TRACE_ID,
                "dd.span_id": SPAN_ID,
                ...entry.context,
            }));

            // Send to Datadog using fetch (available in Node.js 18+)
            // For older Node.js versions, the consuming app should polyfill fetch
            if (typeof fetch === "undefined") {
                throw new Error("fetch is not available. Please use Node.js 18+ or polyfill fetch (e.g., node-fetch)");
            }

            await fetch(this.intakeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(logs),
            });
        } catch (error) {
            // Don't let Datadog errors break the application
            // Log to console as fallback
            console.warn("[SDK Logger] Error sending logs to Datadog:", error);
        }
    }

    private mapLevelToStatus(level: LogEntry["level"]): string {
        switch (level) {
            case "debug":
            case "info":
                return "info";
            case "warn":
                return "warn";
            case "error":
                return "error";
            default:
                return "info";
        }
    }
}

/**
 * Factory function to create a server Datadog sink
 */
export function createServerDatadogSink(options: DatadogSinkOptions): DatadogSink {
    return new ServerDatadogSink(options);
}

/**
 * Initializes a server Datadog sink synchronously
 * Calls onSinkCreated if successful, onError if it fails
 */
export function initializeServerDatadogSink(options: DatadogSinkLoggerOptions): void {
    try {
        const datadogOptions = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            service: "crossmint-sdk",
            version: options.version,
            env: options.environment,
            sampleRate: 100,
            forwardErrorsToLogs: false,
        };
        const sink = createServerDatadogSink(datadogOptions);
        sink.initialize();
        options.onSinkCreated?.(sink);
    } catch (error) {
        options.onError?.(error);
    }
}
