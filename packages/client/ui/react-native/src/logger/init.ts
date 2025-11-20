import {
    DATADOG_CLIENT_TOKEN,
    SdkLogger,
    createLoggerInitOptions,
    detectEnvironmentFromApiKey,
    createClientDatadogSink,
    type LogSink,
    type DatadogSinkLoggerOptions,
} from "@crossmint/common-sdk-base";
import Constants from "expo-constants";
import packageJson from "../../package.json";

interface ReactNativeDatadogSinkLoggerOptions extends DatadogSinkLoggerOptions {
    isExpoGo: boolean;
}

export function initializeReactNativeDatadogSink(options: ReactNativeDatadogSinkLoggerOptions): void {
    const datadogOptions = {
        clientToken: DATADOG_CLIENT_TOKEN,
        site: "datadoghq.com",
        version: options.version,
        env: options.environment,
        sampleRate: 100,
        forwardErrorsToLogs: false,
    };

    // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("@datadog/mobile-react-native")
        .then(async (datadogReactNativeModule: any) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { DdSdkReactNative, DatadogProviderConfiguration } = datadogReactNativeModule;

            // Skip initialization in Expo Go (native modules not available)
            if (!options.isExpoGo && DdSdkReactNative != null && DatadogProviderConfiguration != null) {
                const isInitialized =
                    typeof DdSdkReactNative.isInitialized === "function" && DdSdkReactNative.isInitialized();

                if (!isInitialized) {
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
                        options.onError?.(error);
                    }
                }
            }

            const sink = createClientDatadogSink(datadogOptions, datadogReactNativeModule);
            sink.initialize();
            options.onSinkCreated?.(sink);
        })
        .catch(() => {
            const error = new Error("@datadog/mobile-react-native not found. Datadog logging will be disabled.");
            options.onError?.(error);
        });
}

/**
 * Package-specific logger instance for the React Native UI SDK
 */
export const reactNativeLogger = new SdkLogger();

/**
 * Initialize the SDK logger for the React Native UI SDK
 * Should be called once when the SDK is initialized (typically in CrossmintProvider)
 * This handles React Native-specific Datadog sink initialization
 * @param apiKey - Optional API key to determine environment (development/staging/production)
 */
export function initReactNativeLogger(apiKey?: string): void {
    const environment = detectEnvironmentFromApiKey(apiKey);
    const initOptions = createLoggerInitOptions({
        packageName: packageJson.name,
        packageVersion: packageJson.version,
        apiKey,
        platform: "react-native",
    });

    reactNativeLogger.init(initOptions);

    // Check if running in Expo Go (native modules not available)
    const isExpoGo =
        Constants.executionEnvironment === "storeClient" ||
        Constants.appOwnership === "expo" ||
        !!Constants.expoVersion;

    // Add React Native Datadog sink
    initializeReactNativeDatadogSink({
        service: "crossmint-react-native-ui",
        version: packageJson.version,
        environment,
        isExpoGo,
        onSinkCreated: (sink: LogSink) => reactNativeLogger.addSink(sink),
        onError: (error: unknown) => {
            if (error instanceof Error && error.message.includes("Native modules require")) {
                console.warn(
                    "[React Native UI SDK] Datadog SDK initialization failed. Native modules require a development build (not Expo Go).",
                    error
                );
            } else {
                console.warn("[React Native UI SDK]", error instanceof Error ? error.message : String(error));
            }
        },
    });
}
