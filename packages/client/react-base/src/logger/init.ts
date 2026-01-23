import { SdkLogger, detectPlatform, validateAPIKey, type LogLevel } from "@crossmint/common-sdk-base";
import { BrowserDatadogSink, ServerDatadogSink } from "@crossmint/common-sdk-base";
/**
 * Initialize the SDK logger for the React Base SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles browser-specific Datadog sink initialization
 *
 * Note: This implementation uses HTTP API directly to send logs to Datadog,
 * completely bypassing the Datadog browser SDK. This ensures complete
 * isolation from any client-side Datadog initialization, allowing both
 * instances to coexist without conflicts.
 *
 * @param apiKey - API key to determine environment (development/staging/production) and project ID
 * @param packageName - Name of the package using the logger
 * @param packageVersion - Version of the package using the logger
 * @param consoleLogLevel - Minimum log level for console output (defaults to "debug" for backward compatibility)
 * @returns The initialized logger instance
 */
export function initReactLogger(
    apiKey: string,
    packageName: string,
    packageVersion: string,
    consoleLogLevel?: LogLevel
): SdkLogger {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        throw new Error(`Invalid API key: ${validationResult.message}`);
    }
    const { environment, projectId } = validationResult;
    const logger = new SdkLogger({
        packageName,
        packageVersion,
        environment,
        projectId,
        consoleLogLevel,
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        // Create HTTP-based Datadog sink that sends logs directly via telemetry proxy
        // This bypasses the Datadog browser SDK entirely, ensuring isolation
        const sink = new BrowserDatadogSink(environment);
        logger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        logger.addSink(sink);
    }

    return logger;
}
