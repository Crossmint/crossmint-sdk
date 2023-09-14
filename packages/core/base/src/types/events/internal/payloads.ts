import { FiatEmbeddedCheckoutProps } from "@/types/embed";
import { EmptyObject } from "@/types/system";

import { CrossmintInternalEvents } from "./events";

interface IncomingInternalEventMap {
    [CrossmintInternalEvents.UI_HEIGHT_CHANGED]: { height: number };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_INCOMING_TRANSACTION]: { serializedTransaction: string };
}

interface OutgoingInternalEventMap {
    [CrossmintInternalEvents.PARAMS_UPDATE]: ParamsUpdatePayload;
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_ACCEPTED]: { txId: string };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_REJECTED]: EmptyObject;
}

export type CrossmintInternalEventMap = IncomingInternalEventMap & OutgoingInternalEventMap;

// Params update
export type ParamsUpdatePayload = Partial<
    Record<keyof Omit<FiatEmbeddedCheckoutProps, "onEvent" | "environment">, any>
>;
