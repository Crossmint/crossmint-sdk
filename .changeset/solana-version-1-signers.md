---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Sign Solana approvals from the message the API supplies, so a version-1 transaction can be approved. `SolanaNonCustodialSigner` and `SolanaServerSigner` previously rebuilt the payload with `VersionedTransaction.deserialize(...).message.serialize()`, which throws `Reached end of buffer unexpectedly` on a version-1 transaction. Both now sign the supplied bytes. The bytes signed are unchanged for version 0.

External wallet signers on Solana accept a new optional `onSignBytes` callback, which signs a base58 payload and returns a base58 signature. `SolanaExternalWalletSigner.signMessage` now routes to it, in place of rejecting. A version-1 transaction reaches it because no wallet adapter can sign one: `@solana/web3.js` deserializes a version-1 message but cannot serialize it, so `VersionedTransaction.sign` throws, and `onSign` must return a signed transaction. Version 0 and legacy transactions still go to `onSign` unchanged. A version-1 transaction with no `onSignBytes` configured fails with an error naming the callback.

Choosing the approval payload moves from `wallet.ts` into the chain adapters, as `ChainAdapter.signApproval`. The Solana adapter reads the version from the approval message and sends a version-1 approval to the signer's key directly; every other case keeps the payload it had before. `wallet.ts` no longer names a chain or a signer type when approving.
