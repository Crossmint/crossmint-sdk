import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";
import { DATADOG_CLIENT_TOKEN } from "../init-helpers";
import type { DatadogSinkLoggerOptions } from "../init-helpers";

/**
 * Browser-specific Datadog sink implementation
 * Uses @datadog/browser-logs for logging
 */
export class BrowserDatadogSink implements DatadogSink {
    private initialized = false;
    protected options: DatadogSinkOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private datadogLogger: any = null;

    /**
     * @param options - Datadog configuration options
     * @param datadogLogger - The Datadog browser logs module (datadogLogs)
     */
    constructor(
        options: DatadogSinkOptions,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        datadogLogger: any
    ) {
        this.options = options;
        this.datadogLogger = datadogLogger?.datadogLogs ?? null;
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
            version: this.options.version,
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
                ddsource: "crossmint-sdk",
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

/**
 * Initializes a browser Datadog sink asynchronously
 */
export function initializeBrowserDatadogSink(options: DatadogSinkLoggerOptions): void {
    const datadogOptions = {
        clientToken: DATADOG_CLIENT_TOKEN,
        site: "datadoghq.com",
        service: window.location.hostname,
        version: options.version,
        env: options.environment,
        sampleRate: 100,
        forwardErrorsToLogs: false,
    };

    // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("@datadog/browser-logs")
        .then((datadogLogsModule: any) => {
            const sink = new BrowserDatadogSink(datadogOptions, datadogLogsModule);
            sink.initialize();
            options.onSinkCreated?.(sink);
        })
        .catch(() => {
            const error = new Error(
                "@datadog/browser-logs not found. Datadog logging will be disabled. Install it to enable: npm install @datadog/browser-logs"
            );
            options.onError?.(error);
        });
}
