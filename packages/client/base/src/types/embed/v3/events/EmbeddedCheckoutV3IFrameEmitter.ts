import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { EmbeddedCheckoutV3IncomingEventMap } from "./incoming";
import type { EmbeddedCheckoutV3OutgoingEventMap } from "./outgoing";

export type EmbeddedCheckoutV3IFrameEmitter = IFrameWindow<
    EmbeddedCheckoutV3IncomingEventMap,
    EmbeddedCheckoutV3OutgoingEventMap
>;
