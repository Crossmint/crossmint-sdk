---
"@crossmint/wallets-sdk": minor
---

Wallets whose recovery methods or signers include a quorum (m-of-n) signer now load and read back: `recoveryMethods` and `signers()` return the quorum with its `quorum:<uuid>` locator and member locators, and the quorum types are exported. On Solana, signing as a quorum throws `QuorumSignerNotSupportedError`.

Type changes: `Signer` (returned by `signers()` and re-exported by the React packages) and `RecoverySignerConfigForChain` (in `recoveryMethods`) now include `QuorumSigner`: `type: "quorum"`, with `locator`, `threshold` and `members`. A `switch` that handles every signer type needs a `quorum` case, and code that reads `address` must narrow on `type` first. The API response types now use the quorum shapes the API sends (`members`, `member`).

`recovery` keeps its type and returns the first recovery method that signs on its own. It throws `RecoveryMethodRequiredError` when every recovery method is a quorum; read `recoveryMethods` instead.
