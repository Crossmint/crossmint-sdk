---
"@crossmint/wallets-sdk": minor
---

`send` and `sendTransaction` with a quorum as the signer (`signer: "quorum:…"`) on EVM and Stellar wallets now return the created transaction unsigned, as with `prepareOnly: true`: `transactionId` is set, and `hash` and `explorerLink` are undefined. Before, the call created the transaction and then threw: `TransactionAwaitingApprovalError` with an api-key signer, `QuorumSignerNotSupportedError` with any other signer. Pass `prepareOnly: true` so the return type matches. Solana wallets have no quorums; the API still rejects a quorum signer there.

`send` now treats any truthy `prepareOnly` like `true`, as `sendTransaction` already did. Untyped callers that passed a non-boolean value get the created transaction back unsigned instead of a signed, completed one.
