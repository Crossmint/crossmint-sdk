---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

BREAKING: `recovery` on wallet creation now takes a single recovery method; pass several recovery methods (Solana and Stellar only) with the new `recoveryMethods` array. Exactly one of the two must be provided.

Passing an array to `recovery` now throws `InvalidRecoveryConfigError` before any request is sent, with a message that points at `recoveryMethods`. Passing a non-array to `recoveryMethods` throws the same error instead of a `TypeError`.

Migration: `recovery: [a, b]` → `recoveryMethods: [a, b]`. A single `recovery: a` needs no change.
