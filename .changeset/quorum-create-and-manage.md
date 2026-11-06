---
"@crossmint/wallets-sdk": minor
---

Quorums can be created and managed. `createWallet` takes a quorum `{ type: "quorum", threshold, members }` in `recoveryMethods` (or `recovery`) and in `signers`; `addSigner` and `addRecoveryMethod` take one too. Members are given by their signer config or by their identity alone (an external wallet's address, a server signer's address, a passkey's id, name and public key), and only their identity fields are sent: `onSign` and server secrets stay on this client, and the wallet holds none of the members' keys afterwards. A recovery quorum always goes under `recoveryMethods`. `addRecoveryMethod` now returns the new method's `locator`. `removeSigner` and `removeRecoveryMethod` take a quorum by `{ locator }`, or by its threshold and members, which one read of the wallet's quorums resolves to its locator. `getWallet` and `createWallet` match a quorum in the passed config by its threshold and member set, in any order.
