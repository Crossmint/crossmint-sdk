import { createContext, useContext } from "react";
import type { SdkLogger } from "@crossmint/common-sdk-base";

export const LoggerContext = createContext<SdkLogger | null>(null);

/**
 * Hook to access the SDK logger instance
 * Must be used within LoggerProvider
 */
export function useLogger(): SdkLogger {
    const logger = useContext(LoggerContext);
    if (logger == null) {
        throw new Error("useLogger must be used within LoggerProvider");
    }
    return logger;
}
