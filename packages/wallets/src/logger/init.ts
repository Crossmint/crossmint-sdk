import {
    SdkLogger,
    initializeBrowserDatadogSink,
    initializeServerDatadogSink,
    detectPlatform,
    detectEnvironmentFromApiKey,
    type LogSink,
} from "@crossmint/common-sdk-base";
import { SDK_NAME, SDK_VERSION } from "../utils/constants";

/**
 * Package-specific logger instance for the wallets SDK
 */
export const walletsLogger = new SdkLogger();

/**
 * Initialize the SDK logger for the wallets SDK
 * Should be called once when the SDK is initialized
 * Automatically detects the platform and environment from API key
 * @param apiKey - Optional API key to determine environment (development/staging/production)
 */
export function initWalletsLogger(apiKey: string): void {
    const platform = detectPlatform();
    const environment = detectEnvironmentFromApiKey(apiKey);

    // Initialize the package-specific logger instance with package context
    walletsLogger.init({
        packageName: SDK_NAME,
        packageVersion: SDK_VERSION,
        apiKey,
        platform,
    });

    // Add platform-specific Datadog sink
    switch (platform) {
        case "browser": {
            initializeBrowserDatadogSink({
                environment,
                onSinkCreated: (sink: LogSink) => walletsLogger.addSink(sink),
                onError: (error: unknown) => {
                    console.warn("[Wallets SDK]", error instanceof Error ? error.message : String(error));
                },
            });
            break;
        }
        case "react-native": {
            // React Native logger initialization is handled by @crossmint/client-sdk-react-native-ui
            // This package only initializes for browser/server to avoid bundling React Native dependencies
            // The React Native UI package will initialize the logger with the appropriate Datadog sink
            break;
        }
        case "server": {
            initializeServerDatadogSink({
                environment,
                onSinkCreated: (sink: LogSink) => walletsLogger.addSink(sink),
                onError: (error: unknown) => {
                    console.warn("[Wallets SDK] Failed to initialize Datadog sink:", error);
                },
            });
            break;
        }
        default: {
            // Unknown platform - only use console sink
            break;
        }
    }
}
