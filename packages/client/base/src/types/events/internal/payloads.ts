import { UpdatableEmbeddedCheckoutParams } from "@/types/embed";
import { EmptyObject } from "@/types/system";

import { Blockchain } from "@crossmint/common-sdk-base";

import { CrossmintInternalEvents } from "./events";

interface IncomingInternalEventMap {
    [CrossmintInternalEvents.UI_HEIGHT_CHANGED]: { height: number };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_INCOMING_TRANSACTION]: { serializedTransaction: string };
    [CrossmintInternalEvents.CRYPTO_CHAIN_SWITCH]: { chain: Blockchain };
}

interface OutgoingInternalEventMap {
    [CrossmintInternalEvents.PARAMS_UPDATE]: UpdatableEmbeddedCheckoutParams;
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_ACCEPTED]: { txId: string };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_REJECTED]: EmptyObject;
}

export type CrossmintInternalEventMap = IncomingInternalEventMap & OutgoingInternalEventMap;
