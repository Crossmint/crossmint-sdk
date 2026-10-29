# React Native SDK: Agent Reference

These rules apply to code in this package, on top of the repo root `AGENTS.md`.

## Security

- Never log tokens, passwords, API keys, codes, or personal data (for example email or phone), at any log level. Never put sensitive or personal data in a URL.
- Errors do not expose sensitive data or system details to the caller.
- Store tokens, credentials and personal data in secure storage (Keychain on iOS, Android Keystore on Android), never in `AsyncStorage` or plain files. Use hardware-backed keys when available.
- Android components the SDK declares are `exported="false"`, and the SDK requests only the permissions it needs.
- All traffic uses HTTPS with TLS 1.2 or higher.
- Secure by default. Lowering a protection needs an explicit option whose name says what it gives up.
- Use the platform crypto frameworks. No custom crypto, no MD5 or SHA-1.
- Do not load or run unapproved executable code from outside the package. Approved Crossmint-hosted pages and installed dependencies are allowed.
- Prefer platform and Expo packages over third-party ones. Every new or bumped dependency needs a reason in the PR, stays on its latest patched version, and is not kept by one person.
- Do not commit secrets, keys or certificates, as files, values or comments. Test fixtures use fake values.
- Treat all data as untrusted, even from Crossmint servers. Validate it before it reaches storage, a WebView, or any other sensitive operation.
- Log security-relevant events (for example failed authentication or a rejected origin) in a format that supports monitoring, without sensitive data.
- Authentication features (biometrics, passkeys) give the host app callbacks for failures and fallbacks.
- Public docs explain how to configure the SDK securely and name the common mistakes.
- Security changes come with tests that try to break the protection, not only tests of the happy path.
