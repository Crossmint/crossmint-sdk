import { type Context, createContext, useContext } from "react";
import type { SdkLogger } from "@crossmint/common-sdk-base";

type LoggerContext = Context<SdkLogger | null>;

export const createLoggerContext = (): LoggerContext => createContext<SdkLogger | null>(null);

/**
 * Hook to access the SDK logger instance
 * Must be used within LoggerProvider
 */
export function useLogger(LoggerContext: LoggerContext): SdkLogger {
    const logger = useContext(LoggerContext);
    if (logger == null) {
        throw new Error("useLogger must be used within LoggerProvider");
    }
    return logger;
}
