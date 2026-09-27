---
"@crossmint/client-sdk-react-native-ui": minor
"@crossmint/client-sdk-rn-window": minor
---

Native modules are now peer dependencies, so one release works with Expo SDK 54 through 57 and apps no longer get duplicate native modules.

`@crossmint/client-sdk-react-native-ui` no longer installs `expo-constants`, `expo-device`, `expo-secure-store`, `expo-web-browser`, `react-native-get-random-values`, `react-native-svg` or `react-native-webview`. `@crossmint/client-sdk-rn-window` no longer installs `react-native-get-random-values`, and it now accepts `react-native-webview` 14.

The package now declares `expo` (SDK 54 or later) as a peer, in place of `expo-modules-core` and `@expo/config-plugins`. Both come from your app's `expo` package, matched to its SDK. Before this change, npm could install the latest `expo-modules-core` beside Expo's own copy, which duplicated a native module.

If your app does not already list these packages, install them with `npx expo install`, so that Expo picks the versions that match your SDK:

```bash
npx expo install expo-constants expo-device expo-secure-store expo-web-browser react-native-get-random-values react-native-svg react-native-webview
```
