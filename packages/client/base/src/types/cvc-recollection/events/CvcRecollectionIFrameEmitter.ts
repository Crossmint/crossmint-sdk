import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { CvcRecollectionIncomingEventMap } from "./incoming";
import type { CvcRecollectionOutgoingEventMap } from "./outgoing";

export type CvcRecollectionIFrameEmitter = IFrameWindow<
    CvcRecollectionIncomingEventMap,
    CvcRecollectionOutgoingEventMap
>;
