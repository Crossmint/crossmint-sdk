import { BrowserLoggerInterface } from "./BrowserLoggerInterface";

// Set to true to enable logging on local development
const LOG_IN_LOCALHOST = false;

export class ConsoleProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: object) {
        if (LOG_IN_LOCALHOST) {
            console.log(message, context);
        }
    }

    logError(message: string, context?: object) {
        if (LOG_IN_LOCALHOST) {
            console.error(message, context);
        }
    }

    logWarn(message: string, context?: object) {
        if (LOG_IN_LOCALHOST) {
            console.warn(message, context);
        }
    }
}
