/**
 * Type definitions for Datadog SDK modules
 * These types represent the minimal interface needed from the Datadog SDKs
 * to avoid using `any` types in the sink implementations
 */

/**
 * React Native Datadog SDK types
 * Represents the structure of @datadog/mobile-react-native SDK
 */
export interface DatadogReactNativeSdk {
    DdLogs: DatadogReactNativeLogs | null;
}

/**
 * React Native Datadog Logs interface
 */
export interface DatadogReactNativeLogs {
    debug?: (message: string, attributes?: Record<string, unknown>) => void;
    info?: (message: string, attributes?: Record<string, unknown>) => void;
    warn?: (message: string, attributes?: Record<string, unknown>) => void;
    error?: (message: string, attributes?: Record<string, unknown>) => void;
}

/**
 * Browser Datadog Logs module types
 * Represents the structure of @datadog/browser-logs module
 */
export interface DatadogBrowserLogsModule {
    datadogLogs: DatadogBrowserLogger | null;
}

/**
 * Browser Datadog Logger interface
 */
export interface DatadogBrowserLogger {
    init: (config: DatadogBrowserLoggerConfig) => void;
    getInternalContext: (() => unknown) | null;
    logger: DatadogBrowserLoggerInstance | null;
}

/**
 * Configuration options for initializing the browser Datadog logger
 */
export interface DatadogBrowserLoggerConfig {
    clientToken: string;
    site: string;
    service: string;
    env?: string;
    sessionSampleRate?: number;
    forwardErrorsToLogs?: boolean;
    proxy?: string;
}

/**
 * Browser Datadog Logger instance interface
 */
export interface DatadogBrowserLoggerInstance {
    debug?: (message: string, context?: Record<string, unknown>) => void;
    info?: (message: string, context?: Record<string, unknown>) => void;
    warn?: (message: string, context?: Record<string, unknown>) => void;
    error?: (message: string, context?: Record<string, unknown>) => void;
}
