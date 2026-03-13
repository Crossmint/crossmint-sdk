---
"@crossmint/wallets-sdk": major
"@crossmint/client-sdk-react-base": major
---

Make device signer the default operational signer (WAL-9287).

BREAKING CHANGES:
- Removed `signer` property from `WalletArgsFor` and `WalletCreateArgs`
- `recovery` is now required on `WalletCreateArgs`
- Removed `assembleSigner` public method from `CrossmintWallets`
- Removed `onChangeSigner` callback
- Removed `getOrCreateWallet` from React provider public API; use `getWallet` and `createWallet` separately
- `getWallet` now accepts `alias` instead of `signer`

