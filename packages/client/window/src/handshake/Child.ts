import type { z } from "zod";

import {
    DEFAULT_HANDSHAKE_OPTIONS,
    type EventEmitterWithHandshakeOptions,
    HANDSHAKE_EVENTS,
    type HandshakeChildEvents,
    type HandshakeOptions,
    type HandshakeParentEvents,
} from ".";
import { EventEmitter, type EventMap, type OnActionArgs, type OnActionOptions } from "../EventEmitter";

export class HandshakeChild<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends EventEmitter<
    IncomingEvents,
    OutgoingEvents
> {
    handshakeOptions: Required<HandshakeOptions>;
    isConnected = false;

    constructor(
        otherWindow: Window,
        targetOrigin: string | string[],
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const mergedIncomingEvents = {
            ...options?.incomingEvents,
            ...HANDSHAKE_EVENTS.fromParent,
        } as any satisfies IncomingEvents;
        const mergedOutgoingEvents = {
            ...options?.outgoingEvents,
            ...HANDSHAKE_EVENTS.fromChild,
        } as any satisfies OutgoingEvents;

        super(otherWindow, targetOrigin, mergedIncomingEvents, mergedOutgoingEvents);

        this.handshakeOptions = { ...DEFAULT_HANDSHAKE_OPTIONS, ...options?.handshakeOptions };
    }

    async handshakeWithParent() {
        if (this.isConnected) {
            console.log("[client] Already connected to parent");
            return;
        }

        const { requestVerificationId } = await this._onAction({
            event: "handshakeRequest",
            callback: (data) => data,
            responseEvent: "handshakeResponse",
            options: {
                timeoutMs: this.handshakeOptions.timeoutMs,
            },
        });

        await this._onAction({
            event: "handshakeComplete",
            options: {
                timeoutMs: this.handshakeOptions.timeoutMs,
                condition: (data) => data.requestVerificationId === requestVerificationId,
            },
        });
        this.isConnected = true;
    }

    // Wrap EventEmitter methods, adding handshake event types
    private async _onAction<K extends keyof HandshakeParentEvents, R extends keyof HandshakeChildEvents>(
        args: OnActionArgs<HandshakeParentEvents, HandshakeChildEvents, K, R>
    ): Promise<z.infer<IncomingEvents[K]>> {
        return super.onAction({
            ...args,
            options: args.options as OnActionOptions<EventMap, keyof EventMap>, // Fixes weird TS behavior when compiling
        });
    }
}
