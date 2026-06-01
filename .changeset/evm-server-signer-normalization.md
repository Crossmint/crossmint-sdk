---
"@crossmint/wallets-sdk": minor
---

Normalize EVM server signer key derivation to use "evm" chain type

- Add `deriveServerSignerCandidates` helper that returns both primary ("evm") and legacy (chain-specific) derivations
- Update `deriveServerSignerDetails` to use normalized "evm" chain type for all EVM chains
- Implement dual-derivation fallback in `useSigner`: try primary first, fall back to legacy for backward compatibility
- Update `isRecoverySigner` to match against either derivation
- Cache resolved server derivation in `buildInternalSignerConfig` for signing consistency
