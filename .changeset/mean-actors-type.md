---
"@crossmint/client-sdk-react-native-ui": patch
---

Add IndexedDB error recovery for React Native WebView: automatically detect 'indexeddb-fatal' error responses, reload the WebView, re-establish handshake, and retry the operation once. Also enforce a 15s minimum timeout during recovery to allow sufficient time for WebView reload and handshake completion.
