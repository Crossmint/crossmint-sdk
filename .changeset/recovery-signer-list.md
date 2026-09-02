---
"@crossmint/wallets-sdk": minor
---

Solana and Stellar wallets can now be created with up to 10 recovery signers: `recovery` accepts a list, each entry resolved (passkey creation, server signer derivation) on its own, and `wallet.recoverySigners` exposes all of them while `wallet.recovery` keeps returning the primary one. EVM still takes a single recovery signer.
