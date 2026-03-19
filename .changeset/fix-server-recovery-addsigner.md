---
"@crossmint/wallets-sdk": patch
---

Fix server recovery wallets auto-approve for addSigner

- Preserve user-provided recovery config (with secret) during wallet creation so server recovery signers can properly auto-approve addSigner operations
- Use buildInternalSignerConfig for recovery signer assembly in addSigner, which correctly derives server signer keys

