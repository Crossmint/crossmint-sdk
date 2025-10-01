---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Add @solana/web3.js as peer dependency to resolve VersionedTransaction type mismatches. Users with different @solana/web3.js versions will now use the exact SDK version (1.98.1) to ensure type compatibility.
