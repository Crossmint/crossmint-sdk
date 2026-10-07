---
"@crossmint/client-sdk-react-native-ui": patch
---

The Google Pay config plugin no longer adds its payment queries to the Android manifest a second time when `expo prebuild` runs without `--clean`.
