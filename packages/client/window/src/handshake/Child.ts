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
import type { Transport } from "../transport/Transport";

export class HandshakeChild<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends EventEmitter<
    IncomingEvents,
    OutgoingEvents
> {
    handshakeOptions: Required<HandshakeOptions>;
    isConnected = false;

    constructor(
        transport: Transport<OutgoingEvents>,
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
        super(transport, mergedIncomingEvents, mergedOutgoingEvents);
        this.handshakeOptions = { ...DEFAULT_HANDSHAKE_OPTIONS, ...options?.handshakeOptions };
    }

    async handshakeWithParent() {
        console.log("[HandshakeChild] handshakeWithParent() called");

        if (this.isConnected) {
            console.log("[HandshakeChild] Already connected to parent, skipping handshake");
            return;
        }

        console.log("[HandshakeChild] Waiting for handshake request from parent");

        const { requestVerificationId } = await this._onAction({
            event: "handshakeRequest",
            callback: (data) => {
                console.log("[HandshakeChild] Received handshake request, processing data:", data);
                return data;
            },
            responseEvent: "handshakeResponse",
            options: {
                timeoutMs: this.handshakeOptions.timeoutMs,
            },
        });

        console.log("[HandshakeChild] Waiting for handshake complete from parent");
        await this._onAction({
            event: "handshakeComplete",
            options: {
                timeoutMs: this.handshakeOptions.timeoutMs,
                condition: (data) => data.requestVerificationId === requestVerificationId,
            },
        });

        this.isConnected = true;
        console.log("[HandshakeChild] Handshake completed successfully, connection established");
    }

    // Wrap EventEmitter methods, adding handshake event types
    private async _onAction<K extends keyof HandshakeParentEvents, R extends keyof HandshakeChildEvents>(
        args: OnActionArgs<HandshakeParentEvents, HandshakeChildEvents, K, R>
    ): Promise<z.infer<IncomingEvents[K]>> {
        console.log(`[HandshakeChild] _onAction() called - Event: ${String(args.event)}`);
        return await super.onAction({
            ...args,
            options: args.options as OnActionOptions<EventMap, keyof EventMap>, // Fixes weird TS behavior when compiling
        });
    }
}
