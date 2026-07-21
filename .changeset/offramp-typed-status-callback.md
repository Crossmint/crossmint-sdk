---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Add typed `onOfframpStatusChange` callback to `CrossmintEmbeddedCheckout` (v3). For offramp (cash-out) orders the iframe now emits an `offramp:status` event on each lifecycle phase change, surfaced through the new callback with a typed `EmbeddedOfframpStatus` (`refreshing-quote`, `preparing-deposit`, `awaiting-signature`, `confirming-deposit`, `processing-payout`, `completed`, `payout-failed`, `refunded`, `session-expired`). No-op for non-offramp orders. Additive and backward-compatible.
