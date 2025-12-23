import type { APIKeyEnvironmentPrefix } from "@/apiKey";
import { HttpDatadogSink } from "./HttpDatadogSink";

/**
 * Server/Node.js implementation of Datadog sink
 * Uses HTTP API to send logs to Datadog
 *
 * This is a thin wrapper around HttpDatadogSink for backward compatibility.
 * It sends logs directly to Datadog's HTTP intake endpoint without requiring
 * additional dependencies (uses native fetch in Node.js 18+)
 */
export class ServerDatadogSink extends HttpDatadogSink {
    /**
     * @param environment - Environment prefix from API key
     */
    constructor(environment: APIKeyEnvironmentPrefix) {
        super("server", environment);
    }
}
