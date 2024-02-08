import { UpdatableEmbeddedCheckoutParams } from "@/types/embed";
import { EmptyObject } from "@/types/system";

import { CrossmintInternalEvents } from "./events";
import { Blockchain } from "@crossmint/common-sdk-base";

interface IncomingInternalEventMap {
    [CrossmintInternalEvents.UI_HEIGHT_CHANGED]: { height: number };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_INCOMING_TRANSACTION]: { serializedTransaction: string };
    [CrossmintInternalEvents.CRYPTO_SWITCH_NETWORK]: { network: Blockchain };
}

interface OutgoingInternalEventMap {
    [CrossmintInternalEvents.PARAMS_UPDATE]: UpdatableEmbeddedCheckoutParams;
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_ACCEPTED]: { txId: string };
    [CrossmintInternalEvents.CRYPTO_PAYMENT_USER_REJECTED]: EmptyObject;
}

export type CrossmintInternalEventMap = IncomingInternalEventMap & OutgoingInternalEventMap;
