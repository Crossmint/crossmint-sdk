---
"@crossmint/wallets-sdk": minor
---

Solana wallets now seamlessly default to the recovery signer when the underlying provider does not support device signers.

- `Wallet` accepts a new `solanaProvider` field (set automatically by `WalletFactory` from the API response). When the provider is `"squads"`, `initDeviceSigner` and `recover` skip the device-signer flow entirely and the wallet's default signer falls back to the recovery signer.
- `WalletFactory.createWallet` no longer eagerly attaches a `device` signer to Solana smart wallet creation requests. The provider that backs the wallet is only known after creation, and providers without device-signer support (e.g. `"squads"`) reject those requests. Device-signer registration for supported providers (`"swig"`, `"crossmint"`) is handled by the wallet's post-creation flow.

For providers that support device signers (`"swig"`, `"crossmint"`) and for non-Solana chains, behavior is unchanged: a device signer is still used when `deviceSignerKeyStorage` is configured.
