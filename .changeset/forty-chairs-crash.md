---
"@crossmint/client-sdk-react-base": major
"@crossmint/client-sdk-react-native-ui": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/wallets-sdk": patch
---

Fix issue where email signer was not found when creating wallet without createOnLogin

client-sdk-react-base entry point should be now `CrossmintWalletBaseProvider` instead of `CrossmintWalletUIBaseProvider`
