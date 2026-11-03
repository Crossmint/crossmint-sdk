import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3Appearance } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";

import type { OFFRAMP_ERROR_REASONS, OFFRAMP_STATUSES } from "./events/incoming";

export type OfframpStatus = (typeof OFFRAMP_STATUSES)[number];
export type OfframpErrorReason = (typeof OFFRAMP_ERROR_REASONS)[number];

export type EmbeddedOfframpCredentials = { sessionId: string; clientSecret: string };

export class OfframpSignatureRejectedError extends Error {
    readonly rejected = true;
}

export type EmbeddedOfframpPayer = {
    /**
     * Sign and broadcast the transaction, then resolve with the txId.
     * serializedTransaction is a serialized transaction for EVM chains, and a base58 legacy transaction
     * with feePayer and recentBlockhash set for Solana.
     * payerAddress is the wallet the offramp expects to pay, so refuse if your wallet does not match.
     * Throw OfframpSignatureRejectedError only when the user declined.
     */
    signAndSendTransaction(tx: { serializedTransaction: string; chain: string; payerAddress: string }): Promise<string>;
    /**
     * Optional. Sign `message` with the payer wallet and resolve with the signature: the EIP-191 personal_sign hex string
     * (0x-prefixed) on EVM chains, or the base64 encoding of the 64-byte ed25519 signature over the UTF-8 message on
     * Solana (not base58). The offramp asks only when the user must prove they own the wallet; the message is a
     * Crossmint sign-in challenge for payerAddress. Refuse if your wallet is not payerAddress on chain. Without it such
     * a user is told the wallet needs verifying by your app. Throw OfframpSignatureRejectedError only when the user
     * declined. Adding or removing it reloads the offramp.
     */
    signMessage?(request: { message: string; chain: string; payerAddress: string }): Promise<string>;
};

export interface CrossmintEmbeddedOfframpProps {
    credentials: EmbeddedOfframpCredentials;
    payer: EmbeddedOfframpPayer;
    appearance?: EmbeddedCheckoutV3Appearance;
    locale?: Locale;
    /** Fill the container's height instead of sizing to the content. Give the container a definite height (web) or flex/height (React Native); content taller than it scrolls inside the offramp. Changing it reloads the offramp. */
    fill?: boolean;
    onReady?: () => void;
    onStatusChange?: (event: { status: OfframpStatus; orderId?: string }) => void;
    /** Can fire again when a completed withdrawal is reopened; dedupe by orderId. */
    onComplete?: (event: { orderId: string; txId: string }) => void;
    /** The user closed the flow. Only three buttons call it: Continue on Withdrawal sent, Close on a failure screen (for a sent withdrawal onComplete has already fired), and Cancel when the order's bank account cannot be loaded. No other screen has a Cancel, so give users your own way to close. It does not cancel a wallet request that was already sent; keep the payer mounted until it settles. Without it, those buttons do nothing. */
    onCancel?: () => void;
    onError?: (error: { reason: OfframpErrorReason; retriable: boolean; message: string }) => void;
}
