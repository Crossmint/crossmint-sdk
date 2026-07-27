---
"@crossmint/client-sdk-react-native-ui": patch
---

Fixed device signer native errors reaching JS as "undefined reason" instead of the actual failure message, by overriding `reason` on the thrown Expo `Exception` instead of relying on `description`.
