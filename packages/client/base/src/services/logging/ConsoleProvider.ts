import type { BrowserLoggerInterface } from "./BrowserLoggerInterface";

export class ConsoleProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: object) {
        console.log(message, context);
    }

    logError(message: string, context?: object) {
        console.error(message, context);
    }

    logWarn(message: string, context?: object) {
        console.warn(message, context);
    }
}
