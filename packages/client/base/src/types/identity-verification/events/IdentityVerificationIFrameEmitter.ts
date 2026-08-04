import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { IdentityVerificationIncomingEventMap } from "./incoming";
import type { IdentityVerificationOutgoingEventMap } from "./outgoing";

export type IdentityVerificationIFrameEmitter = IFrameWindow<
    IdentityVerificationIncomingEventMap,
    IdentityVerificationOutgoingEventMap
>;
