---
"@crossmint/client-sdk-react-native-ui": patch
---

Category: bug fix
Product Area: wallets

Fix RN wallet timeout on low-end devices by gating on handshake completion, not just WebView ref existence.
