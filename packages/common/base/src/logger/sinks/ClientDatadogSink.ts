import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";

/**
 * Client-side Datadog sink that works with both browser and React Native Datadog loggers
 * The consuming package should import and pass the appropriate Datadog logger instance
 */
export class ClientDatadogSink implements DatadogSink {
    protected initialized = false;
    protected options: DatadogSinkOptions;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected datadogLogger: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    protected datadogSdk: any = null;
    private isBrowserLogger: boolean;

    /**
     * @param options - Datadog configuration options
     * @param datadogLogger - The Datadog logger instance (browser: datadogLogs, React Native: DdSdkReactNative)
     */
    constructor(
        options: DatadogSinkOptions,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        datadogLogger: any
    ) {
        this.options = options;
        this.datadogSdk = datadogLogger;

        // Detect if this is a browser logger (has datadogLogs property) or React Native logger
        // Browser: { datadogLogs: { init, logger: { info, error, ... } } }
        // React Native: { DdLogs: { info, error, ... }, initialize, isInitialized }
        this.isBrowserLogger = datadogLogger?.datadogLogs != null;

        if (this.isBrowserLogger) {
            this.datadogLogger = datadogLogger.datadogLogs;
        }
    }

    initialize(): void {
        if (this.initialized) {
            return;
        }

        if (this.isBrowserLogger) {
            this.initializeBrowser();
        } else {
            this.initializeReactNative();
        }

        this.initialized = true;
    }

    private initializeBrowser(): void {
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
            sampleRate: this.options.sampleRate ?? 100,
            forwardErrorsToLogs: this.options.forwardErrorsToLogs ?? false,
            // Use telemetry proxy if provided
            ...(this.options.telemetryProxyEndpoint != null && {
                proxyHost: this.options.telemetryProxyEndpoint,
            }),
        });
    }

    private initializeReactNative(): void {
        // For React Native, initialization is handled by the consuming app
        // (e.g., initReactNativeLogger in @crossmint/client-sdk-react-native-ui)
        // The sink should not attempt to initialize the SDK itself, as it requires
        // native module setup that should be done at the app level.
        // We just mark the sink as initialized so it can be used for logging.
        // The actual SDK initialization happens before the sink is created.
    }

    write(entry: LogEntry): void {
        if (this.isBrowserLogger) {
            this.writeBrowser(entry);
        } else {
            this.writeReactNative(entry);
        }
    }

    private writeBrowser(entry: LogEntry): void {
        if (this.datadogLogger == null || this.datadogLogger.logger == null) {
            return;
        }

        try {
            // Map log level to Datadog logger method
            const loggerMethod = this.getBrowserMethod(entry.level);
            if (loggerMethod == null) {
                return;
            }

            // Merge entry context with service info
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

    private writeReactNative(entry: LogEntry): void {
        const DdLogs = this.datadogSdk?.DdLogs;
        if (DdLogs == null || DdLogs.nativeLogs == null) {
            // Native module not ready (e.g., Expo Go or initialization failed)
            return;
        }

        try {
            const loggerMethod = this.getReactNativeMethod(DdLogs, entry.level);
            if (loggerMethod == null) {
                return;
            }

            const attributes = {
                ...entry.context,
                service: this.options.service ?? "crossmint-sdk",
            };

            loggerMethod(entry.message, attributes);
        } catch (error) {
            // Don't let Datadog errors break the application
            console.warn("[SDK Logger] Error writing to Datadog:", error);
        }
    }

    private getBrowserMethod(level: LogEntry["level"]) {
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

    private getReactNativeMethod(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logger: any,
        level: LogEntry["level"]
    ): ((message: string, attributes?: Record<string, unknown>) => void) | null {
        if (logger == null) {
            return null;
        }

        const method = logger[level] ?? logger.info;
        return method != null && typeof method === "function" ? method.bind(logger) : null;
    }
}

/**
 * Factory function to create a client Datadog sink
 * @param options - Datadog configuration options
 * @param datadogLogger - The Datadog logger instance (browser: datadogLogs module, React Native: DdSdkReactNative module)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClientDatadogSink(options: DatadogSinkOptions, datadogLogger: any): DatadogSink {
    return new ClientDatadogSink(options, datadogLogger);
}
