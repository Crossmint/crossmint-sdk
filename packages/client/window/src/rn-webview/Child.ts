import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeChild } from "../handshake/Child";
import { RNWebViewTransport } from "../transport/RNWebViewTransport";

export class RNWebViewChild<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeChild<
    IncomingEvents,
    OutgoingEvents
> {
    constructor(options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>) {
        const transport = new RNWebViewTransport<OutgoingEvents>();
        super(transport, options);
    }
}
