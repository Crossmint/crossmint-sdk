import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { EmbeddedWithdrawIncomingEventMap } from "./incoming";
import type { EmbeddedWithdrawOutgoingEventMap } from "./outgoing";

export type EmbeddedWithdrawIFrameEmitter = IFrameWindow<
    EmbeddedWithdrawIncomingEventMap,
    EmbeddedWithdrawOutgoingEventMap
>;
