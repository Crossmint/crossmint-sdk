---
"@crossmint/wallets-sdk": patch
---

fix: add device signer to EVM adminSigner schemas in OpenAPI spec

Device signers were missing from the adminSigner oneOf union in both
CreateWalletV2025DTO and WalletV2025ResponseDTO for EVM wallets. This
caused TypeScript type errors when using device signers for EVM message
signing, even though the backend fully supports it.
