import type { LogSink } from "./types";
/**
 * Global sink manager that holds shared sinks for all logger instances
 * Sinks are platform-specific and shared across all packages on the same platform
 */
export class SinkManager {
    private sinks: LogSink[] = [];
    private sinkMap: Map<string, LogSink> = new Map();
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
        this.sinkMap.clear();
        this.initialized = true;
        sinks.forEach((sink) => this.addSink(sink));
    }

    /**
     * Add a sink after initialization (useful for async-loaded sinks like Datadog)
     * Auto-initializes with ConsoleSink if not already initialized
     * Prevents duplicate sinks by checking the sink ID
     */
    addSink(sink: LogSink): void {
        if (!this.initialized) {
            this.init([]);
        }

        // Check if a sink with this ID already exists
        if (this.sinkMap.has(sink.id)) {
            // Sink with this ID already exists, skip adding duplicate
            return;
        }

        // Add sink to both array and map
        this.sinks.push(sink);
        this.sinkMap.set(sink.id, sink);
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

export const sinkManager = new SinkManager();
