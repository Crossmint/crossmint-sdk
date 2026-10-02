---
"@crossmint/client-sdk-react-native-ui": patch
---

Log the signer page load state when the WebView handshake fails. The provider now tracks the signer page load (`not-started`, `loading`, `loaded` or `failed`) from `onLoadStart`, `onLoad`, `onError` and `onHttpError`. It sends `onLoadStart`, `onError` and `onHttpError` to the SDK logs, and it adds `pageLoadState` to the handshake retry, handshake error, `onLoadEnd` and frame reset timeout logs and to the handshake error console message. Reload and retry behavior does not change.
