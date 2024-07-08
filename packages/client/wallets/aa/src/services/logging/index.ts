import { isLocalhost } from "@/utils/helpers";

import { DatadogProvider } from "./DatadogProvider";

class LoggerProvider {
    private static instance: LoggerProvider;
    public logInfo!: (message: string, context?: object) => void;
    public logWarn!: (message: string, context?: object) => void;
    public logError!: (message: string, context?: object) => void;

    private constructor(private logOnDatadogOnLocalhost = false) {
        this.setLogger();
    }

    private setLogger() {
        const logger = this.shouldLogToDatadog() ? new DatadogProvider() : this.getEmptyLogger();
        const { logInfo, logWarn, logError } = logger;
        this.logInfo = logInfo;
        this.logWarn = logWarn;
        this.logError = logError;
    }

    private shouldLogToDatadog() {
        return (isLocalhost() && this.logOnDatadogOnLocalhost) || !isLocalhost();
    }

    private getEmptyLogger() {
        return {
            logInfo: () => {},
            logWarn: () => {},
            logError: () => {},
        };
    }

    public setDDLoggerOnLocalhost(logOnDatadog: boolean) {
        console.log("setDDLoggerOnLocalhost", logOnDatadog);
        this.logOnDatadogOnLocalhost = logOnDatadog;
        this.setLogger();
    }

    public static getInstance() {
        if (!LoggerProvider.instance) {
            LoggerProvider.instance = new LoggerProvider();
        }
        return LoggerProvider.instance;
    }
}

export const logger = LoggerProvider.getInstance();
