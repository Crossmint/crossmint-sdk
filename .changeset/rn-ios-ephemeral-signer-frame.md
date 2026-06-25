---
"@crossmint/wallets-sdk": minor
"@crossmint/client-sdk-react-native-ui": minor
"@crossmint/client-sdk-react-ui": minor
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-window": minor
---

On iOS the non-custodial signer stops relying on the signer webview's storage, which isn't reliable across launches and could drop the signer and break signing. The frame now uses non-persistent storage with in-memory key storage, and reloads to re-onboard with a fresh OTP before each signature. Android keeps its existing persistent behavior.

It also recovers the OTP flow when the frame reloads mid-onboarding: the signer detects the reload, requests a fresh code, and keeps the prompt open so the user can enter the new one.
