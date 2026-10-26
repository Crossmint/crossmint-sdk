---
"@crossmint/wallets-sdk": minor
---

Wallets whose recovery methods or signers include a quorum (m-of-n) signer now load and read back: `recoveryMethods` and `signers()` return the quorum with its `quorum:<uuid>` locator and member locators, and the quorum types are exported. Signing as a quorum is not supported yet and throws `QuorumSignerNotSupportedError`.
