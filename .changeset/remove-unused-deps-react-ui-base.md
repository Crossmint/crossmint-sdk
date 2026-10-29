---
"@crossmint/client-sdk-base": patch
"@crossmint/client-sdk-react-ui": patch
---

Remove dependencies the packages do not import: `lodash.isequal` and `@types/lodash.isequal` from `@crossmint/client-sdk-react-ui`, and `@types/uuid` from `@crossmint/client-sdk-base`.
