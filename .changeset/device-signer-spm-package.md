---
"@crossmint/client-sdk-react-native-ui": patch
---

The iOS device signer module now comes from the crossmint-swift-sdk Swift Package instead of the `CrossmintDeviceSigner` pod, since CocoaPods trunk becomes read-only on December 2nd. Apps still use CocoaPods, and `pod install` adds the Swift Package to the Pods project. The config plugin removes the `CrossmintDeviceSigner` simulator fix it used to add to the Podfile, since that pod is no longer installed.
