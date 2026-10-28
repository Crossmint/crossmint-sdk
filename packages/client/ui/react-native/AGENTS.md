# React Native SDK: Agent Reference

These rules apply to code in this package, on top of the repo root `AGENTS.md`.

## Security

- Never log or put in a URL: JWTs, refresh secrets, API keys, OTP and signer codes, private keys, or personal data (email, phone, `authId`). This applies at every log level, to request and response bodies, and to messages sent to or from the signer frame. Use the SDK logger, never `console.log`.
- Secrets go in secure storage, never in `AsyncStorage`. On iOS, Keychain items use a `ThisDeviceOnly` accessibility class. On Android, keys live in the Android Keystore and SDK data stays out of backups.
- Logout clears local session data even when the server call fails.
- Secure by default. Lowering a protection, such as a software key fallback, needs an explicit option whose name says what it gives up.
- Crypto comes from the platform (CryptoKit, Secure Enclave, Android Keystore). No custom crypto, no MD5 or SHA-1.
- WebView bridges accept messages only from Crossmint origins.
- Every new or bumped dependency needs a reason in the PR. Prefer Expo and React Native core packages over packages kept by one person.
