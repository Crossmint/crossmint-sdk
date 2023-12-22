import { BrowserLoggerInterface } from "./BrowserLoggerInterface";

export class ConsoleProvider implements BrowserLoggerInterface {
    logInfo(message: string, context?: unknown) {
        console.log(message, context);
    }

    logError(message: string, context?: unknown) {
        console.error(message, context);
    }

    logWarn(message: string, context?: unknown) {
        console.warn(message, context);
    }
}
