import type { LogSink } from "./types";

/**
 * Global sink manager that holds shared sinks for all logger instances
 * Sinks are platform-specific and shared across all packages on the same platform
 */
export class SinkManager {
    private sinks: LogSink[] = [];
    private initialized = false;

    /**
     * Initialize the sink manager with platform-specific sinks
     * Should be called once per platform (browser, react-native, server)
     */
    init(sinks: LogSink[]): void {
        if (this.initialized) {
            // If already initialized, just add new sinks (for async-loaded sinks like Datadog)
            sinks.forEach((sink) => this.addSink(sink));
            return;
        }
        this.sinks = [];
        this.initialized = true;
        sinks.forEach((sink) => this.addSink(sink));
    }

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     * Auto-initializes with ConsoleSink if not already initialized
     */
    addSink(sink: LogSink): void {
        if (!this.initialized) {
            this.init([]);
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
