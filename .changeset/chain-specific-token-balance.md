---
"@crossmint/wallets-sdk": minor
---

feat(wallets): add chain-specific TokenBalance types with mintAddress for Solana tokens

- Create generic TokenBalance<Chain> types with chain-specific fields
- Solana tokens now return mintAddress instead of contractAddress  
- Stellar tokens return contractId
- EVM tokens continue to return contractAddress
- Update transformTokenBalance logic to use appropriate field based on chain
- Maintain backward compatibility with existing API
