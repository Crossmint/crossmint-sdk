---
'@crossmint/wallets-sdk': patch
'@crossmint/client-sdk-react-ui': patch
---

Remove biometric policy from device signers. Only "none" policies are now created, which is the default for the iframe.
