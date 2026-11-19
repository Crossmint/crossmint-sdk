---
"@crossmint/wallets-sdk": patch
---

API rejections in the quorum flows now surface as typed errors that keep the API's message and `code` instead of the raw response body: `removeSigner`/`removeRecoveryMethod` throw `SignerOperationRejectedError` (and `QuorumRequestError` for `LAST_RECOVERY_SIGNER` and the other quorum codes), `approve()` throws the new `QuorumApprovalRejectedError` — carrying the rejected member's `signerLocator` — when the API rejects the approval of a member of a pending quorum while the request still awaits the others (other rejected approvals still throw `TransactionFailedError` / `SignatureFailedError`), and `WalletCreationError` exposes the API message plus `apiErrorCode`. `TransactionFailedError` is now exported from the package.
