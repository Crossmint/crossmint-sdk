import {
    SdkLogger,
    initializeBrowserDatadogSink,
    detectEnvironmentFromApiKey,
    type LogSink,
    detectPlatform,
    initializeServerDatadogSink,
} from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";

/**
 * Initialize the SDK logger for the React UI SDK
 * Should be called once when the SDK is initialized (typically in CrossmintWalletProvider)
 * This handles browser-specific Datadog sink initialization
 * @param apiKey - API key to determine environment (development/staging/production) and project ID
 * @returns The initialized logger instance
 */
export function initReactUILogger(apiKey: string): SdkLogger {
    const logger = new SdkLogger({
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        apiKey,
    });

    const environment = detectEnvironmentFromApiKey(apiKey);
    const platform = detectPlatform();
    if (platform === "browser") {
        initializeBrowserDatadogSink({
            environment,
            onSinkCreated: (sink: LogSink) => logger.addSink(sink),
            onError: (error: unknown) => {
                console.warn("[React UI SDK]", error instanceof Error ? error.message : String(error));
            },
        });
    } else if (platform === "server") {
        initializeServerDatadogSink({
            environment,
            onSinkCreated: (sink: LogSink) => logger.addSink(sink),
            onError: (error: unknown) => {
                console.warn("[React UI SDK]", error instanceof Error ? error.message : String(error));
            },
        });
    }

    return logger;
}
