---
"@crossmint/wallets-sdk": patch
---

Add recovery signer error classes (`RecoverySignerLimitExceededError`, `DuplicateRecoverySignerError`, `RecoverySignerConflictError`, `SignerRequiredError`, `RecoveryNotSupportedOnChainError`, `NotSupportedOnApiVersionError`, `RecoveryAdminSignerConflictError`, `InvalidRecoveryConfigError`), the `MAX_RECOVERY_SIGNERS` constant, and mapping of the backend recovery error codes to those errors.
