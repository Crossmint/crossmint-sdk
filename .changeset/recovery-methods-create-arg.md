---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

BREAKING: `recovery` on wallet creation now takes a single recovery method; pass several recovery methods (Solana and Stellar only) with the new `recoveryMethods` array. Exactly one of the two must be provided.
