---
"@crossmint/client-sdk-react-native-ui": patch
---

Document Xcode 27 / iOS 27 support. Apps built with the iOS 27 SDK must use the UIKit scene lifecycle, which Expo SDK 58 generates on `npx expo prebuild`. The SDK's native module and config plugin need no change.
