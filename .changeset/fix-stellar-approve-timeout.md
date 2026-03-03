---
"@crossmint/client-sdk-rn-window": patch
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Fix Stellar wallet.approve 30s timeout on React Native

- WebViewParent.sendAction now checks handshake connection before sending, and auto-recovers on timeout by reloading the WebView and retrying once
- DEFAULT_EVENT_OPTIONS adds intervalMs (3s) so TEE requests retry periodically instead of sending once
- initializeWebView now waits for handshake completion (isConnected), not just WebView ref existence
