import { IFrameWindow } from "@crossmint/client-sdk-window";

import { EmbeddedCheckoutV3IncomingEventMap } from "./incoming";
import { EmbeddedCheckoutV3OutgoingEventMap } from "./outgoing";

export type EmbeddedCheckoutV3IFrameEmitter = IFrameWindow<
    EmbeddedCheckoutV3IncomingEventMap,
    EmbeddedCheckoutV3OutgoingEventMap
>;
