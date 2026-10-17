---
"@crossmint/wallets-sdk": patch
---

Device recovery now uses the recovery method selected with `useRecoveryMethod()` when it resumes a pending device-signer approval, and when it falls back to a recovery signer because the provider does not support device signers. Before, both paths always used the primary recovery method.
