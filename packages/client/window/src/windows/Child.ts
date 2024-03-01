import { EventMap } from "../EventEmitter";
import { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeChild } from "../handshake/Child";

export class ChildWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeChild<
    IncomingEvents,
    OutgoingEvents
> {
    constructor(
        parentWindow: Window,
        targetOrigin: string,
        options?: Omit<EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>, "targetOrigin">
    ) {
        super(parentWindow, targetOrigin, options);
    }
}
