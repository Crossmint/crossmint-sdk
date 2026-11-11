# @crossmint/client-sdk-rn-window

## 0.4.0

### Minor Changes

- 5307672: `@crossmint/client-sdk-react-native-ui` now requires **Expo SDK 58** (React Native 0.88, iOS 16.4 or later). Expo SDK 58 builds apps with the UIKit scene lifecycle, which apps built with Xcode 27 / the iOS 27 SDK must use. Apps on Expo SDK 54 to 57 should stay on 1.x until they upgrade Expo.

  The native modules are now peer dependencies. The package no longer installs `expo-constants`, `expo-device`, `expo-secure-store`, `expo-web-browser`, `react-native-get-random-values`, `react-native-svg` or `react-native-webview`. Before this change, the package pinned Expo SDK 54 versions of these modules, which gave apps on newer Expo SDKs a second copy of each native module, and a `react-native-svg` that does not compile against React Native 0.86 or later.

  The package also declares `expo` as a peer, in place of `expo-modules-core` and `@expo/config-plugins`. Both come from your app's `expo` package, matched to its SDK.

  If your app does not already list the peers, install them with `npx expo install`, so that Expo picks the versions for your SDK:

  ```bash
  npx expo install expo-constants expo-device expo-secure-store expo-web-browser react-native-get-random-values react-native-svg react-native-webview
  ```

  `@crossmint/client-sdk-rn-window` no longer installs `react-native-get-random-values`; it is now a peer that accepts 1.x and 2.x. Its `react-native-webview` peer accepts 13 and 14.

### Patch Changes

- 3e22f20: WebView refs type-check with react-native-webview 14, the version Expo SDK 58 ships. react-native-webview 14.0.1 declares `WebView<P = undefined>`, which makes the bare `WebView` type reject every prop. `@crossmint/client-sdk-rn-window` now exports `WebViewInstance` (`WebView<object>`) and uses it for `RNWebView` and `WebViewParent` refs. It also works with react-native-webview 13.

## 0.3.19

### Patch Changes

- Updated dependencies [e7905a8]
  - @crossmint/client-sdk-window@1.2.0

## 0.3.18

### Patch Changes

- Updated dependencies [7d99607]
- Updated dependencies [cfa9710]
  - @crossmint/client-sdk-window@1.1.1

## 0.3.17

### Patch Changes

- Updated dependencies [2dbcdee]
  - @crossmint/client-sdk-window@1.1.0

## 0.3.16

### Patch Changes

- Updated dependencies [1398b65]
  - @crossmint/client-sdk-window@1.0.10

## 0.3.15

### Patch Changes

- a356f13: Improve logging across approve/send transaction flow: remove verbose console.log noise from EventEmitter/Handshake/Transport layers, replace console.warn/error with structured walletsLogger in NCS signers, add timing for TEE operations
- Updated dependencies [a356f13]
  - @crossmint/client-sdk-window@1.0.9

## 0.3.14

### Patch Changes

- Updated dependencies [cdcec95]
  - @crossmint/client-sdk-window@1.0.8

## 0.3.13

### Patch Changes

- 19f61d9: Updates react devdependencies to match the react version used in demo app
- fbedd6e: Fix JSON parse error when receiving 'frame-ready' plain string message from open-signer frame

## 0.3.12

### Patch Changes

- 25ad566: Updates dependencies
- Updated dependencies [25ad566]
  - @crossmint/client-sdk-window@1.0.7

## 0.3.11

### Patch Changes

- 978420c: Updates React to patched version
- Updated dependencies [978420c]
  - @crossmint/client-sdk-window@1.0.6

## 0.3.10

### Patch Changes

- 9386174: Add IndexedDB fatal error recovery with automatic WebView reload and retry. Implements typed error codes (SignerErrorCode.IndexedDbFatal) and opt-in recovery options in WebViewParent for handling fatal IndexedDB errors.

## 0.3.9

### Patch Changes

- 7f3f16a: Improve type definition for refst to accept null and have better compatibility with react types ^19

## 0.3.8

### Patch Changes

- c03813a: rn: bump webview for google pay

## 0.3.7

### Patch Changes

- bbc7229: Add debug logs in RN

## 0.3.6

### Patch Changes

- 1034e0f: Minor issues with retries in event handling
- Updated dependencies [1034e0f]
  - @crossmint/client-sdk-window@1.0.5

## 0.3.5

### Patch Changes

- b9fd4ed: Temporary logs
- Updated dependencies [b9fd4ed]
  - @crossmint/client-sdk-window@1.0.4

## 0.3.4

### Patch Changes

- Updated dependencies [2ad2a06]
  - @crossmint/client-sdk-window@1.0.3

## 0.3.3

### Patch Changes

- a9e19b0: feat: rn embedded checkout

## 0.3.2

### Patch Changes

- Updated dependencies [deff029]
- Updated dependencies [220e9c9]
  - @crossmint/client-sdk-window@1.0.2

## 0.3.1

### Patch Changes

- Updated dependencies [99171e9]
- Updated dependencies [689e639]
- Updated dependencies [b573834]
  - @crossmint/client-sdk-window@1.0.1

## 0.3.0

### Minor Changes

- ab31a54: Security Enhancement

## 0.2.2

### Patch Changes

- 0052d3a: Prop to add custom global js

## 0.2.1

### Patch Changes

- f1d93a8: Fixes adding only one handler for all events

## 0.2.0

### Minor Changes

- 5acfc2f: Initial release with react native transport and handshake

### Patch Changes

- Updated dependencies [5acfc2f]
  - @crossmint/client-sdk-window@1.0.0
