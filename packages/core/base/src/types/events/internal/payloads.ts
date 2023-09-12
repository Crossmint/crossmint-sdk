import { FiatEmbeddedCheckoutProps } from "@/types/embed";
import { EmptyObject } from "@/types/system";

import { CrossmintInternalEvents } from "./events";

export interface CrossmintInternalEventMap {
    [CrossmintInternalEvents.PARAMS_UPDATE]: ParamsUpdatePayload;
    [CrossmintInternalEvents.UI_HEIGHT_CHANGED]: { height: number };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_ACCEPTED]: { txId: string };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_REJECTED]: EmptyObject;
    [CrossmintInternalEvents.CRYPTO_PAYMENT_INCOMING_TRANSACTION]: { serializedTransaction: string };
}

// Params update
export type ParamsUpdatePayload = Partial<
    Record<keyof Omit<FiatEmbeddedCheckoutProps, "onEvent" | "environment">, any>
>;
