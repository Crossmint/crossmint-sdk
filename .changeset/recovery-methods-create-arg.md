---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

Add `recoveryMethods` to wallet creation. It takes a list of recovery methods, each able to authorize on its own. Only Solana and Stellar accept more than one entry.

`recovery` is deprecated in favour of `recoveryMethods`. It still works: a single method or a list is treated exactly like `recoveryMethods`, and the list form logs a deprecation warning. Pass either `recovery` or `recoveryMethods`, not both.

Migration: `recovery: a` → `recoveryMethods: [a]`, and `recovery: [a, b]` → `recoveryMethods: [a, b]`.
