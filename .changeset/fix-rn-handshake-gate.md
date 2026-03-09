---
"@crossmint/client-sdk-react-native-ui": patch
---

Category: bug fix
Product Area: wallets

Fix RN wallet timeout on low-end devices by awaiting handshake completion directly instead of polling for ref existence.
