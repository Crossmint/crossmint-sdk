---
"@crossmint/wallets-sdk": minor
---

`send` and `sendTransaction` with a quorum as the signer (`signer: "quorum:…"`) now return the created transaction unsigned, as with `prepareOnly: true`: `transactionId` is set, and `hash` and `explorerLink` are undefined. Its members approve it with `approve`. Before, the call created the transaction and then threw: `TransactionAwaitingApprovalError` with an api-key signer, `QuorumSignerNotSupportedError` with any other signer. Pass `prepareOnly: true` so the return type matches.
