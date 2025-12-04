import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";
import { DATADOG_CLIENT_TOKEN } from "../init-helpers";
import type { APIKeyEnvironmentPrefix } from "@/apiKey";

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
const SPAN_ID = generateTraceId();

/**
 * Server/Node.js implementation of Datadog sink
 * Uses HTTP API to send logs to Datadog
 *
 * This implementation sends logs directly to Datadog's HTTP intake endpoint
 * without requiring additional dependencies (uses native fetch in Node.js 18+)
 */
export class ServerDatadogSink implements DatadogSink {
    readonly id = "server-datadog";
    private initialized = false;
    private options: DatadogSinkOptions;
    private intakeUrl: string;
    private batchQueue: LogEntry[] = [];
    private batchTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds

    constructor(environment: APIKeyEnvironmentPrefix) {
        this.options = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            service: "crossmint-sdk",
            env: environment,
            sampleRate: 100,
            forwardErrorsToLogs: false,
        };
        const site = "datadoghq.com";
        const fullIntakeUrl = `https://http-intake.logs.${site}/v1/input/${DATADOG_CLIENT_TOKEN}`;
        this.intakeUrl = `https://telemetry.crossmint.com/dd?ddforward=${encodeURIComponent(fullIntakeUrl)}`;
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
                ddtags: `env:${this.options.env ?? "production"},service:${this.options.service ?? "crossmint-sdk"}`,
                hostname: typeof process !== "undefined" ? process.env.HOSTNAME ?? "unknown" : "unknown",
                message: entry.message,
                service: this.options.service ?? "crossmint-sdk",
                status: this.mapLevelToStatus(entry.level),
                timestamp: entry.timestamp,
                "dd-session_id": SPAN_ID,
                ...entry.context,
            }));

            // Send to Datadog using fetch (available in Node.js 18+)
            // For older Node.js versions, the consuming app should polyfill fetch
            if (typeof fetch === "undefined") {
                throw new Error("fetch is not available. Please use Node.js 18+ or polyfill fetch (e.g., node-fetch)");
            }

            const response = await fetch(this.intakeUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(logs),
            });

            if (!response.ok) {
                const responseText = await response.text();
                console.warn(
                    "[SDK Logger] Datadog proxy returned error:",
                    response.status,
                    response.statusText,
                    responseText
                );
            }
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
