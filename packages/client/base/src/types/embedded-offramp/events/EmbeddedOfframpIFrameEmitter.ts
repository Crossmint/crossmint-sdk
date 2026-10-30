import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { EmbeddedOfframpIncomingEventMap } from "./incoming";
import type { EmbeddedOfframpOutgoingEventMap } from "./outgoing";

export type EmbeddedOfframpIFrameEmitter = IFrameWindow<
    EmbeddedOfframpIncomingEventMap,
    EmbeddedOfframpOutgoingEventMap
>;
