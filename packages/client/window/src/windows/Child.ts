import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeChild } from "../handshake/Child";

export class ChildWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeChild<
    IncomingEvents,
    OutgoingEvents
> {
    constructor(
        parentWindow: Window,
        targetOrigin: string | string[],
        options?: Omit<EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>, "targetOrigin">
    ) {
        super(parentWindow, targetOrigin, options);
    }
}
