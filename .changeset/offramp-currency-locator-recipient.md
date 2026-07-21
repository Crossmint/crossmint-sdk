---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Add low-level offramp (cash-out) order-creation props to `CrossmintEmbeddedCheckout` (v3): a `currencyLocator` line item (`{ currencyLocator: "fiat:<currency>", executionParameters: { mode: "exact-in", amount } }`) and a `{ paymentMethodId }` recipient (the payout bank). Additive and backward-compatible — existing NFT/commerce/onramp props are unchanged.
