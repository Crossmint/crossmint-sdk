---
"@crossmint/wallets-sdk": minor
---

Wallets whose recovery methods or signers include a quorum (m-of-n) signer now load and read back: `recoveryMethods` and `signers()` return the quorum with its `quorum:<uuid>` locator and member locators, and the quorum types are exported. Signing as a quorum is not supported yet and throws `QuorumSignerNotSupportedError`.

Type changes: `Signer` (returned by `signers()` and re-exported by the React packages) and `RecoverySignerConfigForChain` (in `recoveryMethods`) now include `QuorumSigner`: `type: "quorum"`, with `locator`, `threshold` and `members`. A `switch` that handles every signer type needs a `quorum` case, and code that reads `address` must narrow on `type` first. In the API response types, quorum approval entries name each member `member` (was `signer`), and Solana and Stellar quorum entries list `members` (was `signers`), as the API sends them; EVM `adminSigner` and `delegatedSigners` can be a quorum.

`recovery` keeps its type and returns the first recovery method that signs on its own. It throws `QuorumSignerNotSupportedError` when every recovery method is a quorum; read `recoveryMethods` instead.
