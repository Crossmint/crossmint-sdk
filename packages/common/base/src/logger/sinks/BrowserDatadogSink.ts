import type { APIKeyEnvironmentPrefix } from "@/apiKey";
import { HttpDatadogSink } from "./HttpDatadogSink";

/**
 * Browser-specific Datadog sink implementation
 * Uses HTTP API to send logs directly to Datadog via telemetry proxy
 *
 * This is a thin wrapper around HttpDatadogSink for backward compatibility.
 * It ensures complete isolation from any client-side Datadog initialization.
 */
export class BrowserDatadogSink extends HttpDatadogSink {
    /**
     * @param environment - Environment prefix from API key
     */
    constructor(environment: APIKeyEnvironmentPrefix) {
        super("browser", environment, window.location.hostname);
    }
}
