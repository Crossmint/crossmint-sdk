---
"@crossmint/client-sdk-rn-window": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Persist TEE identity key in native Keychain/Keystore via postMessage bridge to prevent IndexedDB data loss from WebKit storage eviction on iOS.

- Extended `AllowedGlobalsSchema` to accept `__CROSSMINT_IDENTITY_KEY_BACKUP` JWK global
- Load identity key backup from `expo-secure-store` before mounting WebView
- Handle `identity-key-backup` messages from frame and persist to SecureStore
- Include backup in `secureGlobals` for injection via `injectedJavaScriptBeforeContentLoaded`
