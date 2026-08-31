---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Solana and Stellar wallets can now be created with up to 10 recovery signers: `recovery` accepts a list, each entry resolved (passkey creation, server signer derivation) on its own, and `wallet.recoverySigners` exposes all of them. EVM still takes a single recovery signer.
