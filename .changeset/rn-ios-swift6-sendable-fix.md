---
"@crossmint/client-sdk-react-native-ui": minor
---

Fix iOS build failure under Swift 6 strict concurrency (Expo SDK 56+).

The native `DeviceSignerModule` called an instance helper (`self.defaultStorage()`) inside Expo's `AsyncFunction` closures. Those closures are `@Sendable` in newer `ExpoModulesCore`, and `DeviceSignerModule` (an `ExpoModulesCore.Module` subclass) is not `Sendable`, so capturing `self` is an error under the Swift 6 language mode that newer Xcode toolchains enforce.

The storage-selection helper is now a `static` method, so the closures no longer capture `self`. Behavior is unchanged — it reads only compile-time (`targetEnvironment`) and global (`SecureEnclave.isAvailable`) state.
