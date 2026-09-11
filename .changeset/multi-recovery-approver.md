---
"@crossmint/wallets-sdk": patch
---

`wallet.addSigner` and `wallet.removeSigner` now work on wallets with several recovery methods: they are authorized by the recovery method selected with `wallet.useSigner`, whose locator is sent to the API as `approver`. Selecting an operational (delegated) signer and then adding or removing a signer throws a `SignerRequiredError` before any request is made. `RegisterSignerParams` and `RemoveSignerParams` expose the new optional `approver` field.
