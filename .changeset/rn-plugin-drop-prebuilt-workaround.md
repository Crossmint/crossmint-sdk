---
"@crossmint/client-sdk-react-native-ui": patch
---

The config plugin no longer forces React Native to build from source on iOS. The old workaround existed only for React Native 0.82 on Expo SDK 54, which standard Expo 54 apps (React Native 0.81) never needed. It also matched the Expo SDK 55–57 Podfile templates. On Expo SDK 56+, a source build of React Native with precompiled Expo modules crashes at launch (expo/expo#49948). The simulator architecture fix for `CrossmintDeviceSigner` stays.
