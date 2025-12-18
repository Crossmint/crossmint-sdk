import { DATADOG_CLIENT_TOKEN } from "@/consts";
import { datadogLogs } from "@datadog/browser-logs";

import type { BrowserLoggerInterface } from "./BrowserLoggerInterface";

export class DatadogProvider implements BrowserLoggerInterface {
    constructor(private service: string) {}
    logInfo(message: string, context?: object) {
        log(message, "info", this.service, context);
    }

    logError(message: string, context?: object) {
        log(message, "error", this.service, context);
    }

    logWarn(message: string, context?: object) {
        log(message, "warn", this.service, context);
    }
}

function log(message: string, loggerType: "info" | "error" | "warn", service: string, contextParam?: object) {
    const _context = contextParam ? { ...contextParam, service } : { service };

    init();
    datadogLogs.logger[loggerType](message, _context);
}

function init() {
    const isDatadogInitialized = datadogLogs.getInternalContext() != null;
    if (isDatadogInitialized) {
        return;
    }

    datadogLogs.init({
        clientToken: DATADOG_CLIENT_TOKEN,
        site: "datadoghq.com",
        forwardErrorsToLogs: false,
        sessionSampleRate: 100,
    });
}
