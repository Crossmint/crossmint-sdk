import {
    SdkLogger,
    createLoggerInitOptions,
    initializeBrowserDatadogSink,
    detectEnvironmentFromApiKey,
    detectEnvironment,
    type LogSink,
    initializeServerDatadogSink,
} from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";

/**
 * Package-specific logger instance for the React UI SDK
 */
export const reactUILogger = new SdkLogger();

/**
 * Initialize the SDK logger for the React UI SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles browser-specific Datadog sink initialization
 * @param apiKey - Optional API key to determine environment (development/staging/production)
 */
export function initReactUILogger(apiKey: string): void {
    const environment = detectEnvironmentFromApiKey(apiKey);
    const initOptions = createLoggerInitOptions({
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        apiKey,
    });

    reactUILogger.init(initOptions);

    // Add browser Datadog sink if in browser environment
    if (detectEnvironment() === "browser") {
        initializeBrowserDatadogSink({
            version: packageJson.version,
            environment,
            onSinkCreated: (sink: LogSink) => reactUILogger.addSink(sink),
            onError: (error: unknown) => {
                console.warn("[React UI SDK]", error instanceof Error ? error.message : String(error));
            },
        });
    } else if (detectEnvironment() === "server") {
        initializeServerDatadogSink({
            version: packageJson.version,
            environment,
            onSinkCreated: (sink: LogSink) => reactUILogger.addSink(sink),
            onError: (error: unknown) => {
                console.warn("[React UI SDK] Failed to initialize Datadog sink:", error);
            },
        });
    }
}
