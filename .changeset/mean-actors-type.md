---
"@crossmint/client-sdk-react-native-ui": patch
---

Remove unnecessary retriedOnceRef from IndexedDB error retry logic. The wrapper naturally retries once per call without needing a shared ref, preventing potential cross-call interference.
