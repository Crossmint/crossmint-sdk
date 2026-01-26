import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";
import { DATADOG_CLIENT_TOKEN } from "../init-helpers";
import type { APIKeyEnvironmentPrefix } from "@/apiKey";

/**
 * Platform type for Datadog sink
 */
export type DatadogSinkPlatform = "browser" | "react-native" | "server";

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
 * Unified HTTP-based Datadog sink implementation
 * Uses HTTP API to send logs directly to Datadog via telemetry proxy
 *
 * This implementation sends logs directly to Datadog's HTTP intake endpoint
 * without requiring platform-specific Datadog SDKs, ensuring complete isolation
 * from any client-side Datadog initialization.
 */
export class HttpDatadogSink implements DatadogSink {
    readonly id: string;
    private initialized = false;
    protected options: DatadogSinkOptions;
    private intakeUrl: string;
    private batchQueue: LogEntry[] = [];
    private batchTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly BATCH_SIZE = 10;
    private readonly BATCH_TIMEOUT_MS = 5000; // 5 seconds
    private readonly platform: DatadogSinkPlatform;
    private readonly agentInfo: Record<string, string | undefined>;

    /**
     * @param platform - Platform type (browser, react-native, server)
     * @param environment - Environment prefix from API key
     * @param service - Optional service name. Defaults based on platform:
     *   - browser: window.location.hostname
     *   - react-native: "crossmint-sdk" (or provided bundle ID)
     *   - server: "crossmint-sdk"
     * @param agentInfo - Optional agent information (device, OS version, user agent, etc.)
     */
    constructor(
        platform: DatadogSinkPlatform,
        environment: APIKeyEnvironmentPrefix,
        service?: string,
        agentInfo?: Record<string, string | undefined>
    ) {
        this.platform = platform;
        this.id = `${platform}-datadog`;
        this.agentInfo = agentInfo ?? {};

        this.options = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            service: service ?? "crossmint-sdk",
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
            void this.flush();
        } else {
            // Schedule flush after timeout
            if (this.batchTimeout == null) {
                this.batchTimeout = setTimeout(() => {
                    void this.flush();
                }, this.BATCH_TIMEOUT_MS);
            }
        }
    }

    /**
     * Flush all pending logs to Datadog
     * This method is called automatically when batches are full or timeout,
     * but can also be called manually to ensure logs are sent before app/browser close
     */
    async flush(): Promise<void> {
        if (this.batchQueue.length === 0) {
            return;
        }

        // Flush all remaining logs, not just BATCH_SIZE
        const batch = this.batchQueue.splice(0);
        if (this.batchTimeout != null) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }

        try {
            // Determine hostname based on platform
            let hostname: string;
            switch (this.platform) {
                case "browser":
                    hostname = typeof window !== "undefined" ? window.location.hostname : "browser";
                    break;
                case "react-native":
                    hostname = "react-native";
                    break;
                case "server":
                    hostname = typeof process !== "undefined" ? process.env.HOSTNAME ?? "unknown" : "unknown";
                    break;
            }

            // Get agent information for browser and react-native platforms
            const agentInfo = this.getAgentInfo();

            // Format logs for Datadog HTTP intake
            const logs = batch.map((entry) => ({
                ddtags: `env:${this.options.env ?? "production"},service:${this.options.service ?? "crossmint-sdk"}`,
                hostname,
                message: entry.message,
                service: this.options.service ?? "crossmint-sdk",
                status: this.mapLevelToStatus(entry.level),
                timestamp: entry.timestamp,
                "dd-session_id": SPAN_ID,
                ...agentInfo,
                ...entry.context,
            }));

            // Send to Datadog using fetch
            if (typeof fetch === "undefined") {
                const errorMessage =
                    this.platform === "server"
                        ? "fetch is not available. Please use Node.js 18+ or polyfill fetch (e.g., node-fetch)"
                        : `fetch is not available in this ${this.platform} environment`;
                throw new Error(errorMessage);
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

    /**
     * Collects agent information based on platform
     * Returns device, OS version, and browser agent information when available
     */
    private getAgentInfo(): Record<string, string | undefined> {
        const agentInfo: Record<string, string | undefined> = { ...this.agentInfo };

        // For browser, always include user agent if navigator is available
        if (this.platform === "browser" && typeof navigator !== "undefined") {
            agentInfo.user_agent = navigator.userAgent;
        }

        return agentInfo;
    }
}
