import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { KycVerificationIncomingEventMap } from "./incoming";
import type { KycVerificationOutgoingEventMap } from "./outgoing";

export type KycVerificationIFrameEmitter = IFrameWindow<
    KycVerificationIncomingEventMap,
    KycVerificationOutgoingEventMap
>;
