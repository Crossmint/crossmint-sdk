import type { LogContext, LogSink } from "./types";
import type { SdkLoggerInitOptions } from "./interfaces";
import { ConsoleSink, detectPlatform } from "./index";
import type { Platform } from "./platform";
import { createClientDatadogSink } from "./sinks/ClientDatadogSink";
import { createServerDatadogSink } from "./sinks/ServerDatadogSink";
import { validateAPIKey, validateAPIKeyPrefix, type APIKeyEnvironmentPrefix } from "../apiKey";

/**
 * Datadog client token shared across all SDK packages
 */
export const DATADOG_CLIENT_TOKEN = "pub9d76220d6115fba533270f58bbd2ebce";

export interface DatadogSinkLoggerOptions {
    version: string;
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
 * Detects the environment from an API key
 */
export function detectEnvironmentFromApiKey(apiKey?: string): APIKeyEnvironmentPrefix | undefined {
    if (apiKey == null) {
        return undefined;
    }
    const apiKeyValidation = validateAPIKeyPrefix(apiKey);
    if (apiKeyValidation.isValid) {
        return apiKeyValidation.environment;
    }
    return undefined;
}

/**
 * Initializes a browser Datadog sink asynchronously
 */
export function initializeBrowserDatadogSink(options: DatadogSinkLoggerOptions): void {
    const datadogOptions = {
        clientToken: DATADOG_CLIENT_TOKEN,
        site: "datadoghq.com",
        service: window.location.hostname,
        version: options.version,
        env: options.environment,
        sampleRate: 100,
        forwardErrorsToLogs: false,
    };

    // @ts-expect-error - Error because we dont use 'module' field in tsconfig, which is expected because we use tsup to compile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    import("@datadog/browser-logs")
        .then((datadogLogsModule: any) => {
            const sink = createClientDatadogSink(datadogOptions, datadogLogsModule);
            sink.initialize();
            options.onSinkCreated?.(sink);
        })
        .catch(() => {
            const error = new Error(
                "@datadog/browser-logs not found. Datadog logging will be disabled. Install it to enable: npm install @datadog/browser-logs"
            );
            options.onError?.(error);
        });
}

/**
 * Initializes a server Datadog sink synchronously
 * Calls onSinkCreated if successful, onError if it fails
 */
export function initializeServerDatadogSink(options: DatadogSinkLoggerOptions): void {
    try {
        const datadogOptions = {
            clientToken: DATADOG_CLIENT_TOKEN,
            site: "datadoghq.com",
            service: "crossmint-sdk",
            version: options.version,
            env: options.environment,
            sampleRate: 100,
            forwardErrorsToLogs: false,
        };
        const sink = createServerDatadogSink(datadogOptions);
        sink.initialize();
        options.onSinkCreated?.(sink);
    } catch (error) {
        options.onError?.(error);
    }
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

/**
 * Creates logger initialization options with common setup
 */
export function createLoggerInitOptions(params: CreateLoggerInitOptionsParams): SdkLoggerInitOptions {
    const platform = params.platform ?? detectPlatform();
    const validationResult = validateAPIKey(params.apiKey);
    if (!validationResult.isValid) {
        throw new Error(`Invalid API key: ${validationResult.message}`);
    }
    const { environment, projectId } = validationResult;
    const sinks = params.sinks ?? [new ConsoleSink()];

    const context = createPackageLoggerContext({
        packageName: params.packageName,
        packageVersion: params.packageVersion,
        platform,
        environment,
        projectId,
    });

    return {
        sinks,
        context: {
            ...context,
            ...params.additionalContext,
        },
    };
}
