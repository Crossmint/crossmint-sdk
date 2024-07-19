export interface BrowserLoggerInterface {
    logInfo(message: string, context?: unknown): void;
    logError(message: string, context?: unknown): void;
    logWarn(message: string, context?: unknown): void;
}
