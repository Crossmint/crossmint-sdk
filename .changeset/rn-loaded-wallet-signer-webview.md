---
"@crossmint/client-sdk-react-base": patch
"@crossmint/wallets-sdk": patch
---

React Native: a wallet loaded from the API with an email or phone key that `createOnLogin` does not name now starts the signer WebView and loads with its connection. Before, its email or phone signer fell back to the browser iframe and threw an unhandled `TypeError`. Outside a browser, an email or phone signer with no `clientTEEConnection` now fails with a clear error when it signs.
