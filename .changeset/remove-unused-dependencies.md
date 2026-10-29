---
"@crossmint/client-sdk-base": patch
"@crossmint/client-signers-cryptography": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Remove dependencies the packages do not import: `exponential-backoff` and `uuid` from `@crossmint/client-sdk-base`, `zod` from `@crossmint/client-signers-cryptography`, and `bs58`, `lodash.clonedeep`, `lodash.isequal` and `zod` from `@crossmint/client-sdk-react-native-ui`.
