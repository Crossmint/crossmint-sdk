import { SdkLogger, detectPlatform, validateAPIKey } from "@crossmint/common-sdk-base";
import { BrowserDatadogSink, ServerDatadogSink } from "@crossmint/common-sdk-base";
import * as datadogLogger from "@datadog/browser-logs";
/**
 * Initialize the SDK logger for the React Base SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles browser-specific Datadog sink initialization
 * @param apiKey - API key to determine environment (development/staging/production) and project ID
 * @returns The initialized logger instance
 */
export function initReactLogger(apiKey: string, packageName: string, packageVersion: string): SdkLogger {
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
    });

    const platform = detectPlatform();
    if (platform === "browser") {
        const sink = new BrowserDatadogSink(environment, datadogLogger);
        logger.addSink(sink);
    } else if (platform === "server") {
        const sink = new ServerDatadogSink(environment);
        logger.addSink(sink);
    }

    return logger;
}
