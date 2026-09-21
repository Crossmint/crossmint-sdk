---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

Add `recoveryMethods` to wallet creation. It takes a list of recovery methods, each able to authorize on its own. Only Solana and Stellar accept more than one entry.

`recovery` now documents a single recovery method. Passing a list to `recovery` is deprecated but still works: the SDK treats it exactly like `recoveryMethods` and logs a deprecation warning. Exactly one of `recovery` or `recoveryMethods` must be provided.

Migration: `recovery: [a, b]` → `recoveryMethods: [a, b]`. A single `recovery: a` needs no change.
