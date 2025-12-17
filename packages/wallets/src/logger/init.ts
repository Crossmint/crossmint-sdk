import {
    SdkLogger,
    BrowserDatadogSink,
    detectPlatform,
    validateAPIKey,
    ServerDatadogSink,
} from "@crossmint/common-sdk-base";
import { SDK_NAME, SDK_VERSION } from "../utils/constants";
import * as datadogLogger from "@datadog/browser-logs";

/**
 * Package-specific logger instance for the wallets SDK
 */
export const walletsLogger = new SdkLogger();

/**
 * Initialize the SDK logger for the wallets SDK
 * Should be called once when the SDK is initialized
 * Automatically detects the platform and environment from API key
 * @param apiKey - Optional API key to determine environment (development/staging/production)
 * @param loggingConsent - Whether the user has consented to logging. If false, the logger will not be initialized with Datadog sinks.
 */
export function initWalletsLogger(apiKey: string, loggingConsent?: boolean): void {
    const platform = detectPlatform();
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        throw new Error(`Invalid API key: ${validationResult.message}`);
    }
    const { environment, projectId } = validationResult;
    // Initialize the package-specific logger instance with package context
    walletsLogger.init({
        packageName: SDK_NAME,
        packageVersion: SDK_VERSION,
        environment,
        projectId,
        platform,
    });

    if (loggingConsent === true) {
        // Add platform-specific Datadog sink
        switch (platform) {
            case "browser": {
                const sink = new BrowserDatadogSink(environment, datadogLogger);
                walletsLogger.addSink(sink);
                break;
            }
            case "react-native": {
                // React Native logger initialization is handled by @crossmint/client-sdk-react-native-ui
                // This package only initializes for browser/server to avoid bundling React Native dependencies
                // The React Native UI package will initialize the logger with the appropriate Datadog sink
                break;
            }
            case "server": {
                const sink = new ServerDatadogSink(environment);
                walletsLogger.addSink(sink);
                break;
            }
            default: {
                // Unknown platform - only use console sink
                break;
            }
        }
    }
}
