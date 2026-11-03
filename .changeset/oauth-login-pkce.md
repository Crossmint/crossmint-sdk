---
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/client-sdk-auth": patch
"@crossmint/common-sdk-auth": patch
---

OAuth login in the React Native SDK now uses PKCE. The SDK sends a code challenge when the login starts and the matching verifier when it redeems the one-time secret.
