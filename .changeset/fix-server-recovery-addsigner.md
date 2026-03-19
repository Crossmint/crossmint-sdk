---
"@crossmint/wallets-sdk": patch
---

Fix server recovery wallets auto-approve for addSigner and add createServerSigner helper

- Preserve user-provided recovery config (with secret) during wallet creation so server recovery signers can properly auto-approve addSigner operations
- Use buildInternalSignerConfig for recovery signer assembly in addSigner, which correctly derives server signer keys
- Add createServerSigner() helper function for generating server signer configs with cryptographically random secrets

