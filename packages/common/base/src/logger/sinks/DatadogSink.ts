import type { LogSink } from "../types";

/**
 * Configuration options for Datadog sink
 */
export interface DatadogSinkOptions {
    /**
     * Datadog client token
     */
    clientToken: string;
    /**
     * Datadog site (e.g., 'datadoghq.com', 'datadoghq.eu')
     */
    site: string;
    /**
     * Service name to identify the source of logs
     */
    service?: string;
    /**
     * Environment (e.g., 'production', 'staging', 'development')
     */
    env?: string;
    /**
     * Version of the SDK or application
     */
    version?: string;
    /**
     * Sample rate (0-100). 100 means all logs are sent.
     */
    sampleRate?: number;
    /**
     * Whether to forward errors to logs
     */
    forwardErrorsToLogs?: boolean;
}

/**
 * Base interface for Datadog sink implementations
 * Platform-specific implementations (browser, React Native, server) will extend this
 */
export interface DatadogSink extends LogSink {
    /**
     * Initialize the Datadog logger
     * This should be called once before writing logs
     */
    initialize(): void;
}

/**
 * Factory function type for creating Datadog sinks
 * Platform-specific implementations will provide their own factory
 */
export type DatadogSinkFactory = (options: DatadogSinkOptions) => DatadogSink;
