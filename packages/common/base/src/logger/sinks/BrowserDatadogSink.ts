import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";
import { DATADOG_CLIENT_TOKEN } from "../init-helpers";
import type { DatadogBrowserLogsModule, DatadogBrowserLogger } from "./datadogTypes";
import type { APIKeyEnvironmentPrefix } from "@/apiKey";

/**
 * Browser-specific Datadog sink implementation
 * Uses @datadog/browser-logs for logging
 */
export class BrowserDatadogSink implements DatadogSink {
    readonly id = "browser-datadog";
    private initialized = false;
    protected options: DatadogSinkOptions;
    private datadogLogger: DatadogBrowserLogger | null = null;

    /**
     * @param options - Datadog configuration options
     * @param datadogLogger - The Datadog browser logs module (datadogLogs)
     */
    constructor(environment: APIKeyEnvironmentPrefix, datadogLogger: DatadogBrowserLogsModule) {
        this.options = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            service: window.location.hostname,
            env: environment,
            sampleRate: 100,
            forwardErrorsToLogs: false,
        };
        this.datadogLogger = datadogLogger?.datadogLogs ?? null;
        this.initialize();
    }

    initialize(): void {
        if (this.initialized) {
            return;
        }
        if (this.datadogLogger == null) {
            return;
        }

        // Check if Datadog is already initialized
        const isDatadogInitialized =
            this.datadogLogger.getInternalContext != null && this.datadogLogger.getInternalContext() != null;
        if (isDatadogInitialized) {
            return;
        }

        // Initialize Datadog browser logger
        this.datadogLogger.init({
            clientToken: this.options.clientToken,
            site: this.options.site,
            service: this.options.service ?? "crossmint-sdk",
            env: this.options.env,
            sessionSampleRate: this.options.sampleRate ?? 100,
            forwardErrorsToLogs: this.options.forwardErrorsToLogs ?? false,
            proxy: "https://telemetry.crossmint.com/dd",
        });
        this.initialized = true;
    }

    write(entry: LogEntry): void {
        if (this.datadogLogger == null || this.datadogLogger.logger == null) {
            return;
        }

        try {
            // Map log level to Datadog logger method
            const loggerMethod = this.getLoggerMethod(entry.level);
            if (loggerMethod == null) {
                return;
            }

            const context = {
                ...entry.context,
                service: this.options.service ?? "crossmint-sdk",
            };

            // Write to Datadog
            loggerMethod(entry.message, context);
        } catch (error) {
            // Don't let Datadog errors break the application
            console.warn("[SDK Logger] Error writing to Datadog:", error);
        }
    }

    private getLoggerMethod(level: LogEntry["level"]) {
        if (this.datadogLogger?.logger == null) {
            return null;
        }

        switch (level) {
            case "debug":
                return this.datadogLogger.logger.debug?.bind(this.datadogLogger.logger);
            case "info":
                return this.datadogLogger.logger.info?.bind(this.datadogLogger.logger);
            case "warn":
                return this.datadogLogger.logger.warn?.bind(this.datadogLogger.logger);
            case "error":
                return this.datadogLogger.logger.error?.bind(this.datadogLogger.logger);
            default:
                return this.datadogLogger.logger.info?.bind(this.datadogLogger.logger);
        }
    }
}
