import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3Appearance } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";

import type { OFFRAMP_ERROR_REASONS, OFFRAMP_STATUSES } from "./events/incoming";

export type OfframpStatus = (typeof OFFRAMP_STATUSES)[number];
export type OfframpErrorReason = (typeof OFFRAMP_ERROR_REASONS)[number];

export type EmbeddedOfframpCredentials = { sessionId: string; clientSecret: string };

export class OfframpSignatureRejected extends Error {
    readonly rejected = true;
}

export type EmbeddedOfframpPayer = {
    /** Resolve with the txId once broadcast. Throw OfframpSignatureRejected only when the user declined. */
    signAndSendTransaction(tx: { serializedTransaction: string; chain: string; payerAddress: string }): Promise<string>;
};

export interface CrossmintEmbeddedOfframpProps {
    credentials: EmbeddedOfframpCredentials;
    payer: EmbeddedOfframpPayer;
    appearance?: EmbeddedCheckoutV3Appearance;
    locale?: Locale;
    onReady?: () => void;
    onStatusChange?: (event: { status: OfframpStatus; orderId?: string }) => void;
    onComplete?: (event: { orderId: string; txId: string }) => void;
    onCancel?: () => void;
    onError?: (error: { reason: OfframpErrorReason; retriable: boolean; message: string }) => void;
}
