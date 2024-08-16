import { datadogLogs } from "@datadog/browser-logs";

import { DATADOG_CLIENT_TOKEN, SCW_SERVICE } from "../../utils/constants";
import { BrowserLoggerInterface } from "./BrowserLoggerInterface";

export class DatadogProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: object) {
        log(message, "info", context);
    }

    logError(message: string, context?: object) {
        log(message, "error", context);
    }

    logWarn(message: string, context?: object) {
        log(message, "warn", context);
    }
}

function log(message: string, loggerType: "info" | "error" | "warn", contextParam?: object) {
    const _context = contextParam ? { ...contextParam, service: SCW_SERVICE } : { service: SCW_SERVICE };

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
        sampleRate: 100,
    });
}
