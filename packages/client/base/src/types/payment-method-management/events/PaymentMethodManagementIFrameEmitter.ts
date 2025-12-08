import type { IFrameWindow } from "@crossmint/client-sdk-window";

import type { PaymentMethodManagementIncomingEventMap } from "./incoming";
import type { PaymentMethodManagementOutgoingEventMap } from "./outgoing";

export type PaymentMethodManagementIFrameEmitter = IFrameWindow<
    PaymentMethodManagementIncomingEventMap,
    PaymentMethodManagementOutgoingEventMap
>;
