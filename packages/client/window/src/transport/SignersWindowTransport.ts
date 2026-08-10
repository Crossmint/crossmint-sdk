import { type ListenerId, mintListenerId } from "../EventEmitter";
import type { SimpleMessageEvent } from "./Transport";
import { WindowTransport } from "./WindowTransport";

export class SignersWindowTransport extends WindowTransport {
    addMessageListener(listener: (event: SimpleMessageEvent) => void): ListenerId {
        const wrapped = (event: MessageEvent) => {
            const sameSource = event.source === this.otherWindow;
            const originMatches = this.isTargetOrigin(event.origin);
            if (sameSource && originMatches) {
                listener({
                    type: event.type,
                    data: event.data,
                } as SimpleMessageEvent);
            }
        };

        const id = mintListenerId();
        window.addEventListener("message", wrapped);
        this.listeners.set(id, wrapped);
        return id;
    }
}
