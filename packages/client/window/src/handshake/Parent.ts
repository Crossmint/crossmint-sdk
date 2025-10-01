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
import type { Transport } from "../transport/Transport";

export class HandshakeParent<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends EventEmitter<
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
            ...HANDSHAKE_EVENTS.fromChild,
        } as any satisfies IncomingEvents;
        const mergedOutgoingEvents = {
            ...options?.outgoingEvents,
            ...HANDSHAKE_EVENTS.fromParent,
        } as any satisfies OutgoingEvents;

        super(transport, mergedIncomingEvents, mergedOutgoingEvents);
        this.handshakeOptions = { ...DEFAULT_HANDSHAKE_OPTIONS, ...options?.handshakeOptions };
    }

    async handshakeWithChild() {
        console.log("[HandshakeParent] handshakeWithChild() called");

        if (this.isConnected) {
            console.log("[HandshakeParent] Already connected to child, skipping handshake");
            return;
        }

        const requestVerificationId = generateRandomString();
        console.log(
            "[HandshakeParent] Starting handshake with child using timeout:",
            this.handshakeOptions.timeoutMs,
            "ms"
        );

        console.log("[HandshakeParent] Sending handshake request to child");
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

        console.log("[HandshakeParent] Received valid handshake response, sending handshake complete");
        this._send("handshakeComplete", {
            requestVerificationId,
        });

        this.isConnected = true;
        console.log("[HandshakeParent] Handshake completed successfully, connection established");
    }

    // Wrap EventEmitter methods, adding handshake event types
    private _send<K extends keyof HandshakeParentEvents>(event: K, data: z.infer<HandshakeParentEvents[K]>) {
        console.log("[HandshakeParent] _send() - Data:", data);
        return super.send(event, data);
    }
    private _sendAction<K extends keyof HandshakeParentEvents, R extends keyof HandshakeChildEvents>(
        args: SendActionArgs<HandshakeChildEvents, HandshakeParentEvents, K, R>
    ): Promise<z.infer<HandshakeChildEvents[R]>> {
        console.log(
            `[HandshakeParent] _sendAction() called - Event: ${String(args.event)}, ResponseEvent: ${String(args.responseEvent)}`
        );
        return super.sendAction({
            ...args,
            options: args.options as SendActionOptions<EventMap, keyof EventMap>, // Fixes weird TS behavior when compiling
        });
    }
}
