import type { LogSink } from "./types";

/**
 * Global sink manager that holds shared sinks for all logger instances
 * Sinks are platform-specific and shared across all packages on the same platform
 */
class SinkManager {
    private sinks: LogSink[] = [];
    private initialized = false;

    /**
     * Initialize the sink manager with platform-specific sinks
     * Should be called once per platform (browser, react-native, server)
     */
    init(sinks: LogSink[]): void {
        if (this.initialized) {
            // If already initialized, just add new sinks (for async-loaded sinks like Datadog)
            this.sinks.push(...sinks);
            return;
        }
        this.sinks = [...sinks];
        this.initialized = true;
    }

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     */
    addSink(sink: LogSink): void {
        if (!this.initialized) {
            console.warn("[SinkManager] Cannot add sink before initialization. Call init() first.");
            return;
        }
        this.sinks.push(sink);
    }

    /**
     * Get all registered sinks
     */
    getSinks(): LogSink[] {
        return [...this.sinks];
    }

    /**
     * Check if the sink manager is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }
}

/**
 * Global singleton instance of the sink manager
 */
export const sinkManager = new SinkManager();
