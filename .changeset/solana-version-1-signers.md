---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Sign Solana approvals from `pendingApproval.message` instead of rebuilding the payload with `VersionedTransaction.deserialize(...).message.serialize()`, which throws `Reached end of buffer unexpectedly` on a version-1 transaction. The bytes signed are unchanged for version 0.

Solana external wallet signers accept a new optional `onSignBytes` callback, base58 payload in and base58 signature out. Version-1 approvals route to it, because `@solana/web3.js` cannot serialize a version-1 message for `onSign`. Version 0 and legacy still use `onSign`.

Choosing the approval payload moves from `wallet.ts` to `ChainAdapter.signApproval`.
