import type { z } from "zod";
import type { EventMap } from "../EventEmitter";
import type { Transport, SimpleMessageEvent } from "./Transport";
import { generateRandomString } from "../utils/generateRandomString";

export class WindowTransport<OutgoingEvents extends EventMap = EventMap> implements Transport<OutgoingEvents> {
    private listeners = new Map<string, (event: MessageEvent) => void>();

    constructor(
        private otherWindow: Window,
        private targetOrigin: string | string[]
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

    addMessageListener(listener: (event: SimpleMessageEvent) => void): string {
        const wrapped = (event: MessageEvent) => {
            const originMatches = this.isTargetOrigin(event.origin);
            if (originMatches) {
                listener({
                    type: event.type,
                    data: event.data,
                } as SimpleMessageEvent);
            }
        };

        const id = generateRandomString();
        window.addEventListener("message", wrapped);
        this.listeners.set(id, wrapped);
        return id;
    }

    removeMessageListener(id: string): void {
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
