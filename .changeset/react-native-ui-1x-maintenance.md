---
"@crossmint/client-sdk-react-native-ui": minor
---

1.x maintenance release for apps on Expo SDK 54 to 57, which cannot move to 2.x (Expo SDK 58). It brings the wallet, auth and signer fixes released since 1.9.3, and the embedded offramp, with the 1.x packaging: the Expo native modules stay regular dependencies, and the iOS minimum stays at 15.0. Install it with `npx expo install @crossmint/client-sdk-react-native-ui@v1`.

The package now declares `expo` (`>=54.0.0 <58.0.0`) as a peer, in place of `expo-modules-core` and `@expo/config-plugins`. 1.9.3's open-ended peers let npm install the newest `expo-modules-core` (58.x) at the top of an Expo SDK 54 app, which broke `pod install` and the Android build. Both now come from your app's `expo` package.
