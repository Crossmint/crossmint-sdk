---
"@crossmint/client-sdk-react-native-ui": major
"@crossmint/client-sdk-rn-window": minor
---

`@crossmint/client-sdk-react-native-ui` now requires **Expo SDK 58** (React Native 0.88, iOS 16.4 or later). Expo SDK 58 builds apps with the UIKit scene lifecycle, which apps built with Xcode 27 / the iOS 27 SDK must use. Apps on Expo SDK 54 to 57 should stay on 1.x until they upgrade Expo.

The native modules are now peer dependencies. The package no longer installs `expo-constants`, `expo-device`, `expo-secure-store`, `expo-web-browser`, `react-native-get-random-values`, `react-native-svg` or `react-native-webview`. Before this change, the package pinned Expo SDK 54 versions of these modules, which gave apps on newer Expo SDKs a second copy of each native module, and a `react-native-svg` that does not compile against React Native 0.86 or later.

The package also declares `expo` as a peer, in place of `expo-modules-core` and `@expo/config-plugins`. Both come from your app's `expo` package, matched to its SDK.

If your app does not already list the peers, install them with `npx expo install`, so that Expo picks the versions for your SDK:

```bash
npx expo install expo-constants expo-device expo-secure-store expo-web-browser react-native-get-random-values react-native-svg react-native-webview
```

`@crossmint/client-sdk-rn-window` no longer installs `react-native-get-random-values`; it is now a peer that accepts 1.x and 2.x. Its `react-native-webview` peer accepts 13 and 14.
