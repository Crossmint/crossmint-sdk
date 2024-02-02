import { EventMap } from "../EventEmitter";
import { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeChild } from "../handshake/Child";

export class ChildWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeChild<
    IncomingEvents,
    OutgoingEvents
> {
    private constructor(
        parentWindow: Window,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        super(parentWindow, targetOrigin, options);
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        parentWindow: Window,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        return new ChildWindow(parentWindow, targetOrigin, options);
    }
}
