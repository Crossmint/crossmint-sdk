import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3Appearance } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";

import type { OFFRAMP_ERROR_REASONS, OFFRAMP_STATUSES } from "./events/incoming";

/**
 * The step of the offramp flow, reported by `onStatusChange`. `orderId` can change during one withdrawal, so keep the latest.
 */
export type OfframpStatus = (typeof OFFRAMP_STATUSES)[number];

/**
 * Why `onError` fired. When `retriable` is `false`, the session cannot continue: unmount the component.
 */
export type OfframpErrorReason = (typeof OFFRAMP_ERROR_REASONS)[number];

/**
 * The `sessionId` and `clientSecret` that [Create Offramp Session](https://docs.crossmint.com/offramp/api-reference/create-offramp-session) returns. Create the session on your server.
 */
export type EmbeddedOfframpCredentials = { sessionId: string; clientSecret: string };

/**
 * Throw it from a custom payer when the user declines the transaction and nothing was broadcast. The component reports `wallet-rejected` and lets the user confirm again.
 */
export class OfframpSignatureRejectedError extends Error {
    readonly rejected = true;
}

/**
 * Signs and sends the deposit. Pass `createCrossmintWalletSigner(wallet)` for a Crossmint wallet, or your own object for an external wallet.
 */
export type EmbeddedOfframpPayer = {
    /**
     * Sign and broadcast the transaction for `payerAddress` on `chain`, then resolve with the transaction ID.
     * Throw `OfframpSignatureRejectedError` only when the user declined.
     */
    signAndSendTransaction(tx: { serializedTransaction: string; chain: string; payerAddress: string }): Promise<string>;
};

export interface CrossmintEmbeddedOfframpProps {
    /** The `sessionId` and `clientSecret` from [Create Offramp Session](https://docs.crossmint.com/offramp/api-reference/create-offramp-session). */
    credentials: EmbeddedOfframpCredentials;
    /** Signs and sends the deposit. Use `createCrossmintWalletSigner(wallet)` or your own `EmbeddedOfframpPayer`. */
    payer: EmbeddedOfframpPayer;
    /** Fonts, colors and styles, the same object as embedded checkout's `appearance`. */
    appearance?: EmbeddedCheckoutV3Appearance;
    /** The language of the screens. Defaults to the browser or device language, else `en-US`. */
    locale?: Locale;
    /** Fill the container's height instead of sizing to the content. The container needs a definite height. */
    fill?: boolean;
    /** The first screen is shown. Fires once per load. */
    onReady?: () => void;
    /** The flow moved to another step. See `OfframpStatus`. */
    onStatusChange?: (event: { status: OfframpStatus; orderId?: string }) => void;
    /** The deposit is confirmed. Can fire again for a reopened withdrawal, so dedupe by `orderId`. */
    onComplete?: (event: { orderId: string; txId: string }) => void;
    /** The user closed the flow. Without it, the Continue, Close and Cancel buttons do nothing. */
    onCancel?: () => void;
    /** Something went wrong. See `OfframpErrorReason`. `message` is for logs, not for display. */
    onError?: (error: { reason: OfframpErrorReason; retriable: boolean; message: string }) => void;
}
