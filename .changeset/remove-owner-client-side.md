---
"@crossmint/wallets-sdk": major
"@crossmint/client-sdk-react-base": major
"@crossmint/client-sdk-react-ui": major
"@crossmint/client-sdk-react-native-ui": major
---

BREAKING CHANGE: Remove owner parameter from client-side getOrCreateWallet calls

The `owner` field can no longer be specified in client-side `getOrCreateWallet` calls. Owner is now determined from JWT authentication.

Migration: Remove the `owner` parameter from any client-side wallet creation calls. The owner is automatically determined from the authenticated user's JWT token.
