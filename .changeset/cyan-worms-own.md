---
"@crossmint/wallets-sdk": major
---

# Breaking Change: Promote experimental APIs to stable

We're promoting several experimental APIs to stable by removing the `experimental_` prefix. This is a breaking change that requires updating your code.

## Migration Guide

Update your code to use the new stable API names:

- `experimental_prepareOnly` → `prepareOnly`
- `experimental_callbacks` → `callbacks`
- `experimental_loginWithOAuth` → `loginWithOAuth`
- `experimental_getNfts` → `getNfts`
- `experimental_activity` → `activity`
- `experimental_signer` → `signer`
- `experimental_approval` → `approval`
- `experimental_transaction` → `transaction`
- `experimental_transactions` → `transactions`

These APIs have been thoroughly tested and are now considered stable for production use. 