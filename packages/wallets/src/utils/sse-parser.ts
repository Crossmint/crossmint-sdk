/**
 * Minimal SSE frame parser for fetch ReadableStream responses.
 * Handles the text/event-stream protocol without external dependencies.
 */

export interface SSEEvent {
    event?: string;
    data: string;
}

export function parseSSEEvents(buffer: string): { events: SSEEvent[]; remainder: string } {
    const events: SSEEvent[] = [];
    const lines = buffer.split("\n");
    let currentEvent: Partial<SSEEvent> = {};
    let dataLines: string[] = [];
    let lastCompleteIndex = -1;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Empty line = end of event
        if (line === "" || line === "\r") {
            if (dataLines.length > 0) {
                currentEvent.data = dataLines.join("\n");
                events.push(currentEvent as SSEEvent);
            }
            currentEvent = {};
            dataLines = [];
            lastCompleteIndex = i;
            continue;
        }

        // Comment line (keepalive)
        if (line.startsWith(":")) {
            lastCompleteIndex = i;
            continue;
        }

        const colonIndex = line.indexOf(":");
        if (colonIndex === -1) {
            continue;
        }

        const field = line.slice(0, colonIndex);
        const value = line.slice(colonIndex + 1).replace(/^ /, "");

        if (field === "data") {
            dataLines.push(value);
        } else if (field === "event") {
            currentEvent.event = value;
        }
    }

    // Return unparsed remainder (incomplete event at end of buffer)
    const remainder = lastCompleteIndex < lines.length - 1 ? lines.slice(lastCompleteIndex + 1).join("\n") : "";

    return { events, remainder };
}
