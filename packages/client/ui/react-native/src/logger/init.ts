import { SdkLogger, ReactNativeDatadogSink, validateAPIKey, type ConsoleLogLevel } from "@crossmint/common-sdk-base";
import { AppState } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import packageJson from "../../package.json";

/**
 * Initialize the SDK logger for the React Native UI SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles React Native-specific Datadog sink initialization
 *
 * @param apiKey - API key to determine environment (development/staging/production) and project ID
 * @param consoleLogLevel - Minimum log level for console output (defaults to "debug" for backward compatibility)
 * @returns The initialized logger instance
 */
export function initReactNativeLogger(apiKey: string, consoleLogLevel?: ConsoleLogLevel): SdkLogger {
    const validationResult = validateAPIKey(apiKey);
    if (!validationResult.isValid) {
        throw new Error(`Invalid API key: ${validationResult.message}`);
    }
    const { environment, projectId } = validationResult;
    const logger = new SdkLogger({
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        environment,
        projectId,
        platform: "react-native",
        consoleLogLevel,
    });

    // Get app bundle ID to use as service name in Datadog logs
    const bundleId: string | undefined =
        Constants.expoConfig?.ios?.bundleIdentifier ?? Constants.expoConfig?.android?.package ?? undefined;

    // Collect device and OS information for agent info
    const agentInfo: Record<string, string | undefined> = {};
    if (Device != null) {
        agentInfo.device = Device.modelName ?? Device.deviceName ?? Device.brand ?? undefined;
        agentInfo.os_version = Device.osVersion ?? undefined;
        agentInfo.os_name = Device.osName ?? undefined;
    }

    // Create HTTP-based Datadog sink that sends logs directly via telemetry proxy
    // This bypasses the Datadog React Native SDK entirely, ensuring isolation
    // Service name is set to the app bundle ID for better log identification
    const sink = new ReactNativeDatadogSink(environment, bundleId, agentInfo);
    logger.addSink(sink);

    // Set up app state change listener to flush logs when app goes to background
    // This ensures logs are sent before the app is closed or backgrounded
    setupReactNativeFlushListeners(logger);

    return logger;
}

/**
 * Set up React Native app state change listeners to flush logs when app goes to background
 */
function setupReactNativeFlushListeners(logger: SdkLogger): void {
    AppState.addEventListener("change", (nextAppState) => {
        // Flush logs when app goes to background or inactive
        if (nextAppState === "background" || nextAppState === "inactive") {
            if (typeof logger.flush === "function") {
                void logger.flush();
            }
        }
    });
}
