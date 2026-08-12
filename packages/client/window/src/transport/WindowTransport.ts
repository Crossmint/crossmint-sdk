import type { z } from "zod";
import { type EventMap, type ListenerId, mintListenerId } from "../EventEmitter";
import type { Transport, SimpleMessageEvent } from "./Transport";

export class WindowTransport<OutgoingEvents extends EventMap = EventMap> implements Transport<OutgoingEvents> {
    protected listeners = new Map<ListenerId, (event: MessageEvent) => void>();

    constructor(
        protected otherWindow: Window,
        protected targetOrigin: string | string[]
    ) {}

    send<K extends keyof OutgoingEvents>(message: { event: K; data: z.infer<OutgoingEvents[K]> }): void {
        if (Array.isArray(this.targetOrigin)) {
            this.targetOrigin.forEach((origin) => {
                this.otherWindow.postMessage(message, origin);
            });
        } else {
            this.otherWindow.postMessage(message, this.targetOrigin);
        }
    }

    addMessageListener(listener: (event: SimpleMessageEvent) => void): ListenerId {
        const wrapped = (event: MessageEvent) => {
            // Origin does not identify a sender: two same-origin frames each receive the other's events.
            if (!this.isTargetOrigin(event.origin) || event.source !== this.otherWindow) {
                return;
            }
            listener({
                type: event.type,
                data: event.data,
            } as SimpleMessageEvent);
        };

        const id = mintListenerId();
        window.addEventListener("message", wrapped);
        this.listeners.set(id, wrapped);
        return id;
    }

    removeMessageListener(id: ListenerId): void {
        const listener = this.listeners.get(id);
        if (listener != null) {
            window.removeEventListener("message", listener);
            this.listeners.delete(id);
        }
    }

    protected isTargetOrigin(otherOrigin: string) {
        if (Array.isArray(this.targetOrigin)) {
            return this.targetOrigin.includes(otherOrigin);
        }

        if (this.targetOrigin === "*") {
            return true;
        }
        return this.targetOrigin === otherOrigin;
    }
}
