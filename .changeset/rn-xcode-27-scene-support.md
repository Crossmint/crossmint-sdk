---
"@crossmint/client-sdk-react-native-ui": patch
---

Document Xcode 27 / iOS 27 support. Apps built with the iOS 27 SDK must use the UIKit scene lifecycle. On Expo SDK 57, use `expo` 57.0.23 or later with `expo-build-properties` `ios.enableSceneSupport: true`. The SDK's native module and config plugin need no change.
