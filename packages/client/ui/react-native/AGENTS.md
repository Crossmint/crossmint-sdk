# React Native SDK: Agent Reference

These rules apply to code in this package, on top of the repo root `AGENTS.md`.

## Security

- Never log tokens, passwords, API keys, codes, or personal data (for example email or phone), at any log level. Never put sensitive or personal data in a URL.
- Errors do not expose sensitive data or system details to the caller.
- Store tokens, credentials and personal data in secure storage (Keychain on iOS, Android Keystore on Android), never in `AsyncStorage` or plain files. Use hardware-backed keys when available.
- SDK data stays out of Android cloud backup, and Android components are `exported="false"`. Request only the permissions the module needs.
- All traffic uses HTTPS with TLS 1.2 or higher.
- Secure by default. Lowering a protection needs an explicit option whose name says what it gives up.
- Use the platform crypto frameworks. No custom crypto, no MD5 or SHA-1.
- Treat all data as untrusted, even from Crossmint servers, and do not load or run code from outside the package.
- Prefer platform and Expo packages over third-party ones. Every new or bumped dependency needs a reason in the PR, stays on its latest patched version, and is not kept by one person.
