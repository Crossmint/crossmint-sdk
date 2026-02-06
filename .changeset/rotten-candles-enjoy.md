---
"@crossmint/wallets-sdk": minor
---

feat(wallets): Add `isSmartWalletSignature` option to `signTypedData`

This option controls whether the signature corresponds to the smart wallet or to the signer:
- `true` (default): Smart wallet signature wrapped with ERC6492 for EIP-1271 verification
- `false`: Raw signer signature for ECDSA recovery (ecrecover)

Use `isSmartWalletSignature: false` when integrating with contracts that use raw ECDSA signature verification instead of EIP-1271.
