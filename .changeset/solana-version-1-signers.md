---
"@crossmint/wallets-sdk": patch
---

Sign Solana approvals from the message the API supplies, so a version-1 transaction can be approved. `SolanaNonCustodialSigner` and `SolanaServerSigner` previously rebuilt the payload with `VersionedTransaction.deserialize(...).message.serialize()`, which throws `Reached end of buffer unexpectedly` on a version-1 transaction. Both now sign the supplied bytes, and `wallet.approve` routes `pendingApproval.message` to every Solana signer except an external wallet, which still needs the whole transaction for its wallet adapter. The bytes signed are unchanged for version 0.
