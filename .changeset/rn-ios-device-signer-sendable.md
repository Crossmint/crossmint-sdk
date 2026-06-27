---
"@crossmint/client-sdk-react-native-ui": patch
---

Fix iOS build failure under Swift 6 strict concurrency (Expo SDK 56). The `DeviceSignerModule` Expo native module captured `self` (a non-Sendable `Module` subclass) inside the `@Sendable` `AsyncFunction` closures, which is an error in the Swift 6 language mode. The storage-backend selection helper is now `static`, so the closures no longer capture `self`. Behavior is unchanged.
