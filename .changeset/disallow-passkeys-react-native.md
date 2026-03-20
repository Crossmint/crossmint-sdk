---
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Disallow passkey signers in React Native. Passkeys are not supported in React Native and will now throw a clear error when used as recovery signers, delegated signers, or via createPasskeySigner.
