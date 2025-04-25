import type { EventMap, EventEmitterWithHandshakeOptions } from "@crossmint/client-sdk-window";
import { HandshakeChild } from "@crossmint/client-sdk-window";
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
