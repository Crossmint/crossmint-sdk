import type { APIKeyEnvironmentPrefix } from "@/apiKey";
import { HttpDatadogSink } from "./HttpDatadogSink";

/**
 * React Native-specific Datadog sink implementation
 * Uses HTTP API to send logs directly to Datadog via telemetry proxy
 *
 * This is a thin wrapper around HttpDatadogSink for backward compatibility.
 * It ensures complete isolation from any client-side Datadog initialization.
 */
export class ReactNativeDatadogSink extends HttpDatadogSink {
    /**
     * @param environment - Environment prefix from API key
     * @param service - Service name (typically app bundle ID). Defaults to "crossmint-sdk" if not provided.
     * @param agentInfo - Optional agent information (device, OS version, OS name, etc.)
     */
    constructor(
        environment: APIKeyEnvironmentPrefix,
        service?: string,
        agentInfo?: Record<string, string | undefined>
    ) {
        super("react-native", environment, service, agentInfo);
    }
}
