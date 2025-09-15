---
"@crossmint/wallets-sdk": major
---

BREAKING CHANGE: Rename `serializedTransaction` parameter to `transaction` in Stellar wallet

The `StellarTransactionInput` type now uses `transaction` instead of `serializedTransaction` to maintain consistency with EVM wallet implementations. This affects:

- `StellarTransactionInput` type definition
- `StellarWallet.sendTransaction()` method parameter
- OpenAPI schema definitions

**Migration Guide:**
Update your code to use the new parameter name:

```typescript
// Before
await stellarWallet.sendTransaction({
  serializedTransaction: "AQAAAAB2YWx1ZQ==",
  contractId: "GB3KQJ6N2YIE62YVO67X7W5TQK6Q5ZZ4P2LUVK2U6AU26CJQ626J"
});

// After  
await stellarWallet.sendTransaction({
  transaction: "AQAAAAB2YWx1ZQ==",
  contractId: "GB3KQJ6N2YIE62YVO67X7W5TQK6Q5ZZ4P2LUVK2U6AU26CJQ626J"
});
```
