---
"@crossmint/wallets-sdk": minor
---

Calls that create or approve a request take a `quorum` option (a quorum from `wallet.signers()` / `wallet.recoveryMethods`, or its `quorum:<id>` locator) to act as that quorum: `send`, `sendTransaction` on every chain, EVM `signMessage` / `signTypedData`, Stellar `upgrade` / `migrate`, `approve`, and `addSigner` / `removeSigner` / `addRecoveryMethod` / `removeRecoveryMethod`, which send it as the `approver`. With it, a call returns a result with `status`: `"success"`, or `"awaiting-approval"` with the quorum's `approvals`. Calls without `quorum` keep their types and behavior. Signing as a quorum member comes in a later release; until then a quorum call without `prepareOnly` throws `QuorumSignerNotSupportedError`.
