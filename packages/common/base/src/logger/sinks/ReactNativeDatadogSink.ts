import type { DatadogSink, DatadogSinkOptions } from "./DatadogSink";
import type { LogEntry } from "../types";
import type { DatadogReactNativeSdk, DatadogReactNativeLogs } from "./datadogTypes";
import type { APIKeyEnvironmentPrefix } from "@/apiKey";
import { DATADOG_CLIENT_TOKEN } from "../init-helpers";

/**
 * React Native-specific Datadog sink implementation
 * Uses @datadog/mobile-react-native for logging
 */
export class ReactNativeDatadogSink implements DatadogSink {
    readonly id = "react-native-datadog";
    private initialized = false;
    protected options: DatadogSinkOptions;
    private datadogSdk: DatadogReactNativeSdk | null = null;

    /**
     * @param options - Datadog configuration options
     * @param datadogSdk - The Datadog React Native SDK module (DdSdkReactNative)
     */
    constructor(environment: APIKeyEnvironmentPrefix, datadogSdk: DatadogReactNativeSdk) {
        this.options = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            env: environment,
            sampleRate: 100,
            forwardErrorsToLogs: false,
        };
        this.datadogSdk = datadogSdk;
        this.initialize();
    }

    initialize(): void {
        if (this.initialized) {
            return;
        }
        this.initialized = true;
    }

    write(entry: LogEntry): void {
        const DdLogs = this.datadogSdk?.DdLogs;
        if (DdLogs == null) {
            // Native module not ready (e.g., Expo Go or initialization failed)
            return;
        }

        try {
            const loggerMethod = this.getReactNativeMethod(DdLogs, entry.level);
            if (loggerMethod == null) {
                return;
            }

            const attributes = {
                ...entry.context,
                service: this.options.service ?? "crossmint-sdk",
            };

            loggerMethod(entry.message, attributes);
        } catch (error) {
            // Don't let Datadog errors break the application
            console.warn("[SDK Logger] Error writing to Datadog:", error);
        }
    }

    private getReactNativeMethod(
        logger: DatadogReactNativeLogs,
        level: LogEntry["level"]
    ): ((message: string, attributes?: Record<string, unknown>) => void) | null {
        if (logger == null) {
            return null;
        }

        const method = logger[level] ?? logger.info;
        return method != null && typeof method === "function" ? method.bind(logger) : null;
    }
}
