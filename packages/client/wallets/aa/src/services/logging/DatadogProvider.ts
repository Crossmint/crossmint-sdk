import { DATADOG_CLIENT_TOKEN } from "@/utils/constants";
import { datadogLogs } from "@datadog/browser-logs";

import { BrowserLoggerInterface } from "./BrowserLoggerInterface";

type DatadogContext = object | undefined;

export class DatadogProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: unknown) {
        log(message, "info", context);
    }

    logError(message: string, context?: unknown) {
        log(message, "error", context);
    }

    logWarn(message: string, context?: unknown) {
        log(message, "warn", context);
    }
}

function log(message: string, loggerType: "info" | "error" | "warn", context?: unknown) {
    const _context = context as DatadogContext;
    init();
    datadogLogs.logger[loggerType](message, _context as DatadogContext);
}

function init() {
    const isDatadogInitialized = datadogLogs.getInternalContext() != null;
    if (isDatadogInitialized) {
        return;
    }

    datadogLogs.init({
        clientToken: DATADOG_CLIENT_TOKEN,
        site: "datadoghq.com",
        forwardErrorsToLogs: true,
        sampleRate: 100,
    });
}
