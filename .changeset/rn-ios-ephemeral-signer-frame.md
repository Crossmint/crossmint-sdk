---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

On iOS, the React Native non-custodial signer stops relying on the signer webview's storage, which isn't reliable across launches and could drop the device identity and break signing. The signer frame now uses non-persistent storage with in-memory device storage, and reloads to re-onboard with a fresh OTP before each signature.

Android keeps its existing persistent behavior.
