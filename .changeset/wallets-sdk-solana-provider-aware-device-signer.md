---
"@crossmint/wallets-sdk": minor
---

Solana wallets now seamlessly fall back to the recovery signer when the underlying provider does not support device signers.

- `WalletFactory.createWallet` no longer eagerly attaches a `device` signer to Solana smart wallet creation. The provider that backs a Solana wallet is determined server-side; the post-creation flow registers the device signer reactively.
- When the backend rejects device-signer registration with the stable `DEVICE_SIGNER_NOT_SUPPORTED` error code, `Wallet.recover` swallows the error, deletes any local device key, caches the unsupported state on the wallet instance, and auto-assembles the recovery signer so the next transaction works without any consumer-visible changes.
- A new `DeviceSignerNotSupportedError` is thrown from `addSigner` when the backend returns the stable error code, allowing consumers that call `addSigner` directly to detect and handle the case.

For providers that support device signers and for non-Solana chains, behavior is unchanged: a device signer is still used when `deviceSignerKeyStorage` is configured.
