---
"@crossmint/client-sdk-react-native-ui": patch
---

Report why the signer WebView handshake fails. The provider now tracks the signer page load from `onLoadStart`, `onLoad` and `onError`. It sends `onLoadStart`, `onError` and `onHttpError` to the SDK logs, and it adds the page load state to the handshake retry, handshake error, `onLoadEnd` and frame reset timeout logs. When the handshake retries run out, the error now says whether the signer page never finished loading, failed to load, or loaded but did not answer. Reload and retry behavior does not change.
