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
    private listening = false;

    /**
     * @param environment - Environment prefix from API key
     */
    constructor(environment: APIKeyEnvironmentPrefix) {
        super("browser", environment, window.location.hostname);
    }

    // Registered on first use, not in the constructor: a sink the sink manager discards as a duplicate is never
    // initialized, so it is not kept alive by the listener.
    initialize(): void {
        if (!this.listening) {
            this.listening = true;
            // Logs still in the batch when the page is closed or navigated away would be lost.
            window.addEventListener("pagehide", () => {
                void this.flush();
            });
        }
        super.initialize();
    }
}
