---
"@crossmint/wallets-sdk": major
"@crossmint/client-sdk-react-ui": major
"@crossmint/client-sdk-react-base": major
---

Rename DelegatedSigner to Signer and AdminSignerConfig to RecoverySignerConfig.

BREAKING CHANGE: The exported type `DelegatedSigner` has been renamed to `Signer`. The old name is still available as a deprecated alias but will be removed in a future release. Similarly, `DelegatedSignerInput` has been renamed to `SignerInput`, and `AdminSignerConfig` has been renamed to `RecoverySignerConfig`.

