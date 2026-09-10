---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Sign Solana approvals from the message the API supplies, so a version-1 transaction can be approved. `SolanaNonCustodialSigner` and `SolanaServerSigner` previously rebuilt the payload with `VersionedTransaction.deserialize(...).message.serialize()`, which throws `Reached end of buffer unexpectedly` on a version-1 transaction. Both now sign the supplied bytes, and `wallet.approve` routes `pendingApproval.message` to every Solana signer except an external wallet, which still needs the whole transaction for its wallet adapter. The bytes signed are unchanged for version 0.

External wallet signers on Solana accept a new optional `onSignBytes` callback, which signs a base58 payload and returns a base58 signature. `SolanaExternalWalletSigner` reads the version off the serialized transaction and calls `onSignBytes` only for version 1, because `@solana/web3.js` can deserialize a version-1 message but cannot serialize one, so neither `VersionedTransaction.sign` nor a wallet adapter can produce that signature. Version 0 and legacy transactions still go to `onSign` unchanged. A version-1 transaction with no `onSignBytes` configured now fails with an error naming the callback, in place of `Transaction message version 1 deserialization is not supported`. Supply `onSignBytes` when the key is held directly; a browser wallet adapter cannot serve it.
