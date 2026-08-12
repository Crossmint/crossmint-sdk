import { act } from "@testing-library/react";
import { vi } from "vitest";

const listeners = new Map<string, (data: unknown) => void>();

// `on` returns an id distinct from the event name on purpose, so a cleanup that passes event names
// to `off()` instead of the returned ids fails the unmount tests instead of silently leaking.
export const iframeClient = {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
        listeners.set(event, handler);
        return `listener-id:${event}`;
    }),
    off: vi.fn(),
};

export function emit(event: string, data: unknown) {
    const handler = listeners.get(event);
    if (handler == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    act(() => handler(data));
}

export function resetIFrameEmitter() {
    listeners.clear();
    vi.clearAllMocks();
}
