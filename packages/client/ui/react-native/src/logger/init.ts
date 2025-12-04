import {
    DATADOG_CLIENT_TOKEN,
    SdkLogger,
    ReactNativeDatadogSink,
    validateAPIKey,
    type APIKeyEnvironmentPrefix,
} from "@crossmint/common-sdk-base";
import Constants from "expo-constants";
import packageJson from "../../package.json";
import * as datadogReactNativeModule from "@datadog/mobile-react-native";

const { DdSdkReactNative, DatadogProviderConfiguration } = datadogReactNativeModule;

type InitializeDatadogOptions = {
    environment: APIKeyEnvironmentPrefix;
    isExpoGo: boolean;
};

export async function initializeDatadog(options: InitializeDatadogOptions): Promise<void> {
    try {
        const config = new DatadogProviderConfiguration(
            DATADOG_CLIENT_TOKEN,
            options.environment ?? "production",
            "crossmint-sdk",
            false, // trackUserInteractions
            false, // trackXHRResources
            false // trackErrors
        );
        config.site = "datadoghq.com";

        await DdSdkReactNative.initialize(config);
    } catch (error) {
        if (error instanceof Error && error.message.includes("Native modules require")) {
            console.warn(
                "[React Native UI SDK] Datadog SDK initialization failed. Native modules require a development build (not Expo Go).",
                error
            );
        } else {
            console.warn("[React Native UI SDK]", error instanceof Error ? error.message : String(error));
        }
    }
}

/**
 * Initialize the SDK logger for the React Native UI SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles React Native-specific Datadog sink initialization
 * @param apiKey - API key to determine environment (development/staging/production) and project ID
 * @returns The initialized logger instance
 */
export function initReactNativeLogger(apiKey: string): SdkLogger {
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
    });

    const isExpoGo =
        Constants.executionEnvironment === "storeClient" ||
        Constants.appOwnership === "expo" ||
        !!Constants.expoVersion;

    initializeDatadog({
        environment,
        isExpoGo,
    });
    const sink = new ReactNativeDatadogSink(environment, datadogReactNativeModule);
    logger.addSink(sink);

    return logger;
}
