---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-base": minor
---

Rename DelegatedSigner to Signer and AdminSignerConfig to RecoverySignerConfig.

The exported type `DelegatedSigner` has been renamed to `Signer`. `DelegatedSignerInput` → `SignerInput`, `AdminSignerConfig` → `RecoverySignerConfig`. The internal `Signer` interface (signing mechanism adapter) has been renamed to `SignerAdapter` and is now publicly exported for consumers using `additionalSigners`.

