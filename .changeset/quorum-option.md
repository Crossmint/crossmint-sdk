---
"@crossmint/wallets-sdk": minor
---

Calls that create or approve a request take a `quorum` option (a quorum from `wallet.signers()` / `wallet.recoveryMethods`, or its `quorum:<id>` locator) to act as that quorum. With it, `send`, `sendTransaction`, `approve`, `signMessage`, `signTypedData` and Stellar `upgrade` / `migrate` return a result with `status`: `"success"`, or `"awaiting-approval"` with the quorum's `approvals`. Signer changes send it as the `approver`. Calls without `quorum` keep their result types. `prepareOnly` is now optional in the option types. Signing as a quorum member comes in a later release; until then a quorum call without `prepareOnly` throws `QuorumSignerNotSupportedError`.
