import { SdkLogger, createLoggerInitOptions } from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";

/**
 * Package-specific logger instance for the React Base SDK
 */
export const reactBaseLogger = new SdkLogger();

/**
 * Initialize the SDK logger for the React Base SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * @param apiKey - Optional API key to determine environment (development/staging/production)
 */
export function initReactBaseLogger(apiKey?: string): void {
    const initOptions = createLoggerInitOptions({
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        apiKey,
    });

    reactBaseLogger.init(initOptions);
}
