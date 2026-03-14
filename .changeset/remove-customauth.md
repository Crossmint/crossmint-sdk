---
"@crossmint/common-sdk-base": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-native-ui": minor
"@crossmint/wallets-sdk": minor
---

Remove deprecated customAuth (experimental_customAuth, experimental_setCustomAuth, CustomAuth type) from the SDK. All authentication now uses the setJwt/crossmint.jwt pattern instead.
