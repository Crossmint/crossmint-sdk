import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { ProtectedInputIncomingEventMap } from "./incoming";
import type { ProtectedInputOutgoingEventMap } from "./outgoing";

export type ProtectedInputIFrameEmitter = IFrameWindow<ProtectedInputIncomingEventMap, ProtectedInputOutgoingEventMap>;
