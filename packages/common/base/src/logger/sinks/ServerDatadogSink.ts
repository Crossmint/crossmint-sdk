import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";

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
        // Determine intake URL based on site
        const site = options.site ?? "datadoghq.com";
        const baseUrl = site.includes("eu")
            ? "https://http-intake.logs.datadoghq.eu"
            : "https://http-intake.logs.datadoghq.com";
        this.intakeUrl =
            options.telemetryProxyEndpoint != null
                ? `${options.telemetryProxyEndpoint}/v1/input`
                : `${baseUrl}/v1/input/${options.clientToken}`;
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
