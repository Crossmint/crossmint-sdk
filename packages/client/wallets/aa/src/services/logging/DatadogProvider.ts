import { datadogLogs } from "@datadog/browser-logs";


import { BrowserLoggerInterface } from "./BrowserLoggerInterface";
import { DATADOG_CLIENT_TOKEN } from "@/utils/constants";

type DatadogContext = object | undefined;

export class DatadogProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: unknown) {
        const _context = context as DatadogContext;
        init();
        datadogLogs.logger.info(message, _context);
    }
    logError(message: string, context?: unknown) {
        const _context = context as DatadogContext;
        init();
        datadogLogs.logger.error(message, _context);
    }
    logWarn(message: string, context?: unknown) {
        const _context = context as DatadogContext;
        init();
        datadogLogs.logger.warn(message, _context);
    }
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
