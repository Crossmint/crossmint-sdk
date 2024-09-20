import { generateRandomString } from "@/utils/generateRandomString";
import type { z } from "zod";

import {
    DEFAULT_HANDSHAKE_OPTIONS,
    type EventEmitterWithHandshakeOptions,
    HANDSHAKE_EVENTS,
    type HandshakeChildEvents,
    type HandshakeOptions,
    type HandshakeParentEvents,
} from ".";
import { EventEmitter, type EventMap, type SendActionArgs, type SendActionOptions } from "../EventEmitter";

export class HandshakeParent<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends EventEmitter<
    IncomingEvents,
    OutgoingEvents
> {
    handshakeOptions: Required<HandshakeOptions>;
    isConnected = false;

    constructor(
        otherWindow: Window,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const mergedIncomingEvents = {
            ...options?.incomingEvents,
            ...HANDSHAKE_EVENTS.fromChild,
        } as any satisfies IncomingEvents;
        const mergedOutgoingEvents = {
            ...options?.outgoingEvents,
            ...HANDSHAKE_EVENTS.fromParent,
        } as any satisfies OutgoingEvents;

        super(otherWindow, targetOrigin, mergedIncomingEvents, mergedOutgoingEvents);

        this.handshakeOptions = { ...DEFAULT_HANDSHAKE_OPTIONS, ...options?.handshakeOptions };
        this.targetOrigin = targetOrigin;
    }

    async handshakeWithChild() {
        if (this.isConnected) {
            console.log("[server] Already connected to child");
            return;
        }
        const requestVerificationId = generateRandomString();

        await this._sendAction({
            event: "handshakeRequest",
            data: { requestVerificationId },
            responseEvent: "handshakeResponse",
            options: {
                timeoutMs: this.handshakeOptions.timeoutMs,
                intervalMs: this.handshakeOptions.intervalMs,
                condition: (data) => data.requestVerificationId === requestVerificationId,
            },
        });
        this._send("handshakeComplete", {
            requestVerificationId,
        });
        this.isConnected = true;
    }

    // Wrap EventEmitter methods, adding handshake event types
    private _send<K extends keyof HandshakeParentEvents>(event: K, data: z.infer<HandshakeParentEvents[K]>) {
        return super.send(event, data);
    }
    private _sendAction<K extends keyof HandshakeParentEvents, R extends keyof HandshakeChildEvents>(
        args: SendActionArgs<HandshakeChildEvents, HandshakeParentEvents, K, R>
    ): Promise<z.infer<HandshakeChildEvents[R]>> {
        return super.sendAction({
            ...args,
            options: args.options as SendActionOptions<EventMap, keyof EventMap>, // Fixes weird TS behavior when compiling
        });
    }
}
