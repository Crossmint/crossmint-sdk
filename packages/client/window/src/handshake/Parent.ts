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
    private _ongoingHandshakeWithChild?: Promise<void>;

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

    /**
     * Establishes handshake with child using single-flight pattern.
     * If called while another handshake is running, returns the existing promise.
     */
    async handshakeWithChild() {
        if (this._ongoingHandshakeWithChild == null) {
            this._ongoingHandshakeWithChild = (async () => {
                try {
                    await this._performHandshake();
                } finally {
                    this._ongoingHandshakeWithChild = undefined;
                }
            })();
        }
        return await this._ongoingHandshakeWithChild;
    }

    /**
     * Performs the actual handshake logic.
     */
    private async _performHandshake() {
        if (this.isConnected) {
            return;
        }

        console.info(`[HandshakeParent] Starting handshake (timeout: ${this.handshakeOptions.timeoutMs}ms)`);
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
        console.info("[HandshakeParent] Handshake completed");
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
