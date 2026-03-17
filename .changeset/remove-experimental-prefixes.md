---
"@crossmint/wallets-sdk": major
"@crossmint/client-sdk-react-base": major
"@crossmint/client-sdk-react-ui": major
---

Remove experimental_ prefixes from wallets SDK public API

BREAKING CHANGE: All experimental_ prefixed APIs have been graduated to stable with new names:

- `experimental_prepareOnly` -> `prepareOnly`
- `experimental_callbacks` -> `_callbacks`
- `experimental_loginWithOAuth` -> `loginWithOAuth`
- `experimental_getNfts` -> `getNfts` / `nfts`
- `experimental_activity` -> `getTransfers` / `transfers`
- `experimental_signer` -> `signer`
- `experimental_approval` -> `approval`
- `experimental_transaction` -> `transaction`
- `experimental_transactions` -> `transactions`
