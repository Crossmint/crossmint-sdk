import type { LogContext, LogSink } from "./types";
import { detectPlatform } from "./index";
import type { Platform } from "./platform";
import type { APIKeyEnvironmentPrefix } from "../apiKey";

/**
 * Datadog client token shared across all SDK packages
 */
export const DATADOG_CLIENT_TOKEN = "pub9d76220d6115fba533270f58bbd2ebce";

export interface DatadogSinkLoggerOptions {
    environment?: APIKeyEnvironmentPrefix;
    onSinkCreated?: (sink: LogSink) => void;
    onError?: (error: unknown) => void;
}

/**
 * Options for creating a package logger context
 */
export interface PackageLoggerContextOptions {
    packageName: string;
    packageVersion: string;
    projectId: string;
    environment: APIKeyEnvironmentPrefix;
    platform: Platform;
}

/**
 * Creates a logger context object for a package
 */
export function createPackageLoggerContext(options: PackageLoggerContextOptions): LogContext {
    const platform = options.platform ?? detectPlatform();
    return {
        sdk_version: options.packageVersion,
        sdk_name: options.packageName,
        platform,
        environment: options.environment,
        project_id: options.projectId,
        package: options.packageName,
    };
}

/**
 * Options for creating logger initialization options
 */
export interface CreateLoggerInitOptionsParams {
    packageName: string;
    packageVersion: string;
    apiKey: string;
    platform?: Platform;
    sinks?: LogSink[];
    additionalContext?: LogContext;
}
