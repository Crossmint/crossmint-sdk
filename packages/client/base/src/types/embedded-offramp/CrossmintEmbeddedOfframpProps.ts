import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3Appearance } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";

import type { OFFRAMP_ERROR_REASONS, OFFRAMP_STATUSES } from "./events/incoming";

/**
 * The step of the offramp flow, reported by `onStatusChange`.
 *
 * | Status | Meaning |
 * | --- | --- |
 * | `loading` | The offramp is loading the session or an order. |
 * | `entering-amount` | The user enters the amount to withdraw. |
 * | `selecting-bank` | The user picks, renames or removes one of their saved bank accounts. |
 * | `adding-bank` | The user adds a bank account. |
 * | `verifying-identity` | The order needs identity verification, and the user is completing it. |
 * | `identity-in-review` | The user finished identity verification, and it is in review. |
 * | `reviewing` | The user reviews the quote, the fees and the bank account before withdrawing. It is also reported while the order is being prepared or needs a new rate. |
 * | `awaiting-signature` | The component asked the payer to sign and send the deposit, and waits for the wallet. |
 * | `confirming-deposit` | The deposit was sent, or may have been sent, and the offramp waits for it to confirm. |
 * | `completed` | The deposit is confirmed and the payout to the bank account is in progress. `onComplete` fires. |
 * | `payout-completed` | The payout to the bank account is complete. `onComplete` fires if it has not already fired for this order. |
 * | `payout-failed` | The payout to the bank account failed. `onError` reports `payout-failed`. |
 * | `failed` | The withdrawal cannot continue. `onError` reports why. |
 *
 * `orderId` is present while an order is on screen, and absent on the amount and bank account screens and when an error ends the session.
 * One withdrawal can span several orders: after identity verification passes, after the wallet declines the deposit, or when the user takes a new rate, the component creates a new order, so `orderId` changes. Keep the latest `orderId`.
 */
export type OfframpStatus = (typeof OFFRAMP_STATUSES)[number];

/**
 * The reason that `onError` reports.
 *
 * When `retriable` is `false`, the session cannot continue: unmount the component. When the component shows a failure screen, its **Close** button calls `onCancel`.
 * When `retriable` is `true`, the same step can succeed on a retry, and in most cases the component shows the problem and lets the user try again.
 * The `failed` status always ends the session, whatever `retriable` says.
 *
 * | Reason | Retriable | Meaning | What to do |
 * | --- | --- | --- | --- |
 * | `invalid-credentials` | No | The session was rejected or can no longer act: its token is not valid, or its one-hour window for new withdrawals has ended. | Create a new session and pass its credentials. |
 * | `invalid-configuration` | No | The component is misconfigured, for example its props cannot be read, or the identity verification step failed in a way a retry cannot fix. On React Native, also an HTTP 4xx when loading the offramp. When the props cannot be read, the offramp shows no screen. | Unmount the component and fix the integration, starting with the props and the API key passed to `CrossmintProvider`. |
 * | `session-spent` | No | The session cannot start this withdrawal: it was already used, or an earlier withdrawal from this wallet is still being confirmed. | Wait for the earlier withdrawal to settle, then create a new session. |
 * | `identity-verification-required` | No | The user must be verified before withdrawing, and the component cannot run the verification, for example because your project collects KYC through the API. | Submit the user's KYC data ([Import User KYC Data](https://docs.crossmint.com/offramp/guides/import-user-kyc-data)), then create a new session. |
 * | `identity-verification-failed` | No | The user did not pass identity verification. | Do not start another withdrawal for this user. [Failure Reasons](https://docs.crossmint.com/identity/failure-reasons) lists why verification can fail. |
 * | `wallet-ownership-required` | No | The order needs proof that the user owns the payer wallet. | Link the wallet with an ownership `proof` ([Link External Wallet to User](https://docs.crossmint.com/api-reference/users/link-wallet)), then create a new session. |
 * | `bank-not-supported` | Yes | The bank account cannot receive this withdrawal, for example from the payer wallet's chain. | None. The user picks or adds another bank account. |
 * | `bank-not-verified` | Yes | The bank account is not verified yet. | None. The component waits for the verification, or the user picks another bank account. |
 * | `bank-holder-mismatch` | Yes | The bank account holder's name does not match the user's verified identity. | None. The user adds an account in their own name. |
 * | `amount-too-low` | Yes | The amount is below the minimum for this bank account. | None. The component shows it on the amount screen. |
 * | `amount-too-high` | Yes | The amount is above the user's current limit. | None. The component shows it on the amount screen. |
 * | `exact-payout-unsupported` | Yes | The bank account takes an amount to send, not an amount to receive. | None. The amount screen switches to the amount to send. |
 * | `insufficient-funds` | Yes | The wallet does not hold enough stablecoin, or enough gas, for this withdrawal. | Fund the wallet, then the user can try again. |
 * | `wallet-rejected` | Yes | The payer threw `OfframpSignatureRejectedError`. The component creates a new order with a fresh rate. | None. The user can confirm again. |
 * | `payout-failed` | No | The payout to the bank account failed. When the deposit is refunded, the screen tells the user that their funds are being returned to their wallet. | Look up the order by `orderId` to follow it ([Manage Orders](https://docs.crossmint.com/offramp/guides/manage-orders)). |
 * | `provider-error` | Yes | Crossmint could not complete a step, such as a quote, the deposit or identity verification. On React Native, also a connection failure or an HTTP 5xx when loading the offramp. | Let the user try again, and log `message` if it repeats. If the status is `failed`, the withdrawal has ended: follow the order by `orderId`. On React Native, remount the component, for example by changing its `key`, to retry a page that did not load. |
 * | `unknown` | Yes | An unexpected error. | Log `message`. |
 */
export type OfframpErrorReason = (typeof OFFRAMP_ERROR_REASONS)[number];

/**
 * The `sessionId` and `clientSecret` that [Create Offramp Session](https://docs.crossmint.com/offramp/api-reference/create-offramp-session) returns. Create the session on your server, because it needs your server-side API key.
 */
export type EmbeddedOfframpCredentials = { sessionId: string; clientSecret: string };

/**
 * The error a custom payer throws when the user declines the transaction in their wallet.
 * The component then reports `wallet-rejected` through `onError` (`retriable` is `true`) and creates a new order with a fresh rate, so the user can confirm again.
 * Throw it only when the user declined and nothing was broadcast.
 */
export class OfframpSignatureRejectedError extends Error {
    readonly rejected = true;
}

/**
 * Signs and sends the deposit. Pass `createCrossmintWalletSigner(wallet)` for a Crossmint wallet, or your own object for an external wallet.
 *
 * The component calls `signAndSendTransaction` when the user confirms the withdrawal:
 *
 * | Your method | What the component does |
 * | --- | --- |
 * | Resolves with the transaction ID | Waits for the deposit to confirm (`confirming-deposit`). |
 * | Throws `OfframpSignatureRejectedError` | Treats it as a decline: reports `wallet-rejected` through `onError` and creates a new order with a fresh rate, so the user can confirm again. |
 * | Throws any other error, or resolves with no transaction ID | Cannot tell whether the deposit was broadcast, so it moves to the confirming screen (`confirming-deposit`) and keeps checking the order, every few seconds and about once a minute after 20 minutes. It does not call `onError` then, and the screen has no button. If no deposit has been recorded when the session's 24-hour status window ends, `onError` reports `invalid-credentials`, the status becomes `failed`, and the screen shows **This session has expired** with a **Close** button. Until then the user waits there, even when nothing was sent, unless your app closes the component with its own control. |
 * | Has not settled after 2 minutes | Waits for the deposit on the confirming screen, and still takes the transaction ID if the method resolves later. |
 *
 * No thrown error refuses a deposit cleanly: `OfframpSignatureRejectedError` offers a new rate for the same wallet, so a wallet mismatch fails again on the next attempt, and any other error leaves the user on the confirming screen.
 * The deposit is prepared for the payer wallet of the session, so mount `CrossmintEmbeddedOfframp` only while your connected wallet has the same address and chain, and otherwise ask the user to switch wallets.
 */
export type EmbeddedOfframpPayer = {
    /**
     * Sign and broadcast the transaction, then resolve with the transaction ID.
     * `serializedTransaction` is a serialized transaction on EVM chains, and a base58 legacy transaction with `feePayer` and `recentBlockhash` set on Solana.
     * `chain` is the chain the deposit was prepared for.
     * `payerAddress` is the wallet the deposit was prepared for, so refuse if your wallet does not match.
     * Throw `OfframpSignatureRejectedError` only when the user declined.
     */
    signAndSendTransaction(tx: { serializedTransaction: string; chain: string; payerAddress: string }): Promise<string>;
};

export interface CrossmintEmbeddedOfframpProps {
    /** The `sessionId` and `clientSecret` that [Create Offramp Session](https://docs.crossmint.com/offramp/api-reference/create-offramp-session) returns. Changing it reloads the offramp. */
    credentials: EmbeddedOfframpCredentials;
    /** Signs and sends the deposit. Pass `createCrossmintWalletSigner(wallet)` for a Crossmint wallet, or your own object for an external wallet. See `EmbeddedOfframpPayer`. It can change without a reload. */
    payer: EmbeddedOfframpPayer;
    /** Fonts, colors and component styles. It takes the same object as the embedded checkout's `appearance`, described in [UI Customization](https://docs.crossmint.com/onramp/guides/ui-customization). The identity verification step uses it too. Changing it reloads the offramp. */
    appearance?: EmbeddedCheckoutV3Appearance;
    /** The language of the screens, such as `en-US` or `es-ES`. Defaults to the browser or device language when it is supported, otherwise `en-US`. Changing it reloads the offramp. */
    locale?: Locale;
    /** Fill the container's height instead of sizing to the content. Defaults to `false`: the component is then at least 650px tall plus padding on every screen, and grows when a screen needs more (on React Native, put it in a `ScrollView` if the screen can be shorter). With `fill`, give the container a definite height (web, such as `100vh`) or `flex: 1` or a height (React Native); content taller than it scrolls inside the offramp. In both modes the component takes the container's full width. Changing it reloads the offramp. */
    fill?: boolean;
    /** The offramp loaded the session and shows its first screen. It fires once per load, also when the session fails to load, in which case `onError` reports why. It does not fire when the offramp page cannot load or its props are invalid. */
    onReady?: () => void;
    /** The flow moved to another step. See `OfframpStatus`. */
    onStatusChange?: (event: { status: OfframpStatus; orderId?: string }) => void;
    /** The deposit for an order is confirmed and the payout to the bank account is in progress or complete. `txId` is the deposit's transaction ID. It fires once per order and load, so it fires again when the user reopens a completed withdrawal: dedupe by `orderId`. The payout can still fail afterwards: `onStatusChange` and `onError` then report `payout-failed` for the same `orderId`. Confirm the payout on your server with [Manage Orders](https://docs.crossmint.com/offramp/guides/manage-orders) or webhooks. */
    onComplete?: (event: { orderId: string; txId: string }) => void;
    /** The user closed the flow. Only three buttons call it: **Continue** on Withdrawal sent (`onComplete` has already fired), **Close** on a failure screen, and **Cancel** when the order's bank account cannot be loaded. Without it, those buttons do nothing. No other screen has a **Cancel** button, so give users your own way to close. Closing the view while the deposit is confirming does not stop the deposit or the payout: keep the latest `orderId` from `onStatusChange` and follow it with [Manage Orders](https://docs.crossmint.com/offramp/guides/manage-orders) or webhooks. Unmounting the component does not cancel a wallet request that was already sent, so keep the payer's wallet available until it settles. */
    onCancel?: () => void;
    /** Something went wrong. See `OfframpErrorReason`. `message` is for your logs, not for display. */
    onError?: (error: { reason: OfframpErrorReason; retriable: boolean; message: string }) => void;
}
