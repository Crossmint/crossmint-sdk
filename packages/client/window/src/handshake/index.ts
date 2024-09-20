import { z } from "zod";

import type { EventEmitterOptions, EventMap } from "../EventEmitter";

export * from "./Child";
export * from "./Parent";

export interface HandshakeOptions {
    timeoutMs?: number;
    intervalMs?: number;
}
export type EventEmitterWithHandshakeOptions<
    IncomingEvents extends EventMap = EventMap,
    OutgoingEvents extends EventMap = EventMap,
> = EventEmitterOptions<IncomingEvents, OutgoingEvents> & {
    handshakeOptions?: HandshakeOptions;
    targetOrigin?: string;
};

export const DEFAULT_HANDSHAKE_OPTIONS: Required<HandshakeOptions> = {
    timeoutMs: 10000,
    intervalMs: 100,
};

export const HANDSHAKE_EVENTS = {
    fromChild: {
        handshakeResponse: z.object({
            requestVerificationId: z.string(),
        }),
    } as const satisfies EventMap,
    fromParent: {
        handshakeRequest: z.object({
            requestVerificationId: z.string(),
        }),
        handshakeComplete: z.object({
            requestVerificationId: z.string(),
        }),
    } as const satisfies EventMap,
};

export type HandshakeEvents = typeof HANDSHAKE_EVENTS.fromParent & typeof HANDSHAKE_EVENTS.fromChild;
export type HandshakeParentEvents = typeof HANDSHAKE_EVENTS.fromParent;
export type HandshakeChildEvents = typeof HANDSHAKE_EVENTS.fromChild;
