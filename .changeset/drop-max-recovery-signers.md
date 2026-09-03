---
"@crossmint/wallets-sdk": minor
---

Remove the exported `MAX_RECOVERY_SIGNERS` constant and the client-side recovery-list length check. The backend is the single source of truth for the signer limit; requests over it still surface as `RecoverySignerLimitExceededError`.
