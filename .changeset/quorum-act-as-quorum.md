---
"@crossmint/wallets-sdk": minor
---

A key that is only a quorum member acts as its quorum. With no `signer` option, `send`, `sendTransaction` (every chain), `signMessage` and `signTypedData` create the request as that key's quorum, and throw `QuorumSelectionAmbiguousError` when the key is a member of several quorums. `signMessage` and `signTypedData` take a `signer` option, like `send`, so `signer: "quorum:<id>"` requests an ERC-1271 signature as that quorum. Other keys, and Stellar `upgrade` / `migrate`, send their signer as before.
