import type { ConsoleLogLevel, LogLevel } from "./types";

const LOG_LEVEL_HIERARCHY: LogLevel[] = ["debug", "info", "warn", "error"];

let _globalConsoleLogLevel: ConsoleLogLevel = "debug";

/**
 * Set the global console log level.
 * This is automatically called when a ConsoleSink is created with a specific log level.
 * It affects direct console calls that use logToConsole().
 */
export function setGlobalConsoleLogLevel(level: ConsoleLogLevel): void {
    _globalConsoleLogLevel = level;
}

function shouldLogToConsole(level: LogLevel): boolean {
    if (_globalConsoleLogLevel === "silent") return false;
    const entryIdx = LOG_LEVEL_HIERARCHY.indexOf(level);
    const minIdx = LOG_LEVEL_HIERARCHY.indexOf(_globalConsoleLogLevel);
    return entryIdx >= minIdx;
}

/**
 * Log to console while respecting the global console log level set via `consoleLogLevel`.
 * Use this instead of direct `console.*` calls in SDK code to ensure the
 * `consoleLogLevel` setting from CrossmintProvider is respected.
 */
export const logToConsole = {
    debug(...args: unknown[]): void {
        if (shouldLogToConsole("debug")) console.debug(...args);
    },
    info(...args: unknown[]): void {
        if (shouldLogToConsole("info")) console.info(...args);
    },
    warn(...args: unknown[]): void {
        if (shouldLogToConsole("warn")) console.warn(...args);
    },
    error(...args: unknown[]): void {
        if (shouldLogToConsole("error")) console.error(...args);
    },
    log(...args: unknown[]): void {
        if (shouldLogToConsole("debug")) console.log(...args);
    },
};
