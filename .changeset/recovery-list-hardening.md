---
"@crossmint/wallets-sdk": patch
---

Harden `wallet.useSigner` for recovery signer lists: server secrets are stripped from every entry of `wallet.recoveryMethods` (not only the primary), each server recovery signer resolves its own primary/legacy derivation and cached secret, and a passkey only matches a recovery signer with the same credential id when both are known. Constructing a wallet with an empty recovery list now throws `InvalidRecoveryConfigError`.
