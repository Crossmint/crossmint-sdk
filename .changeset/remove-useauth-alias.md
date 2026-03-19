---
"@crossmint/client-sdk-react-base": major
"@crossmint/client-sdk-react-ui": major
"@crossmint/client-sdk-react-native-ui": major
---

Remove `useAuth` hook alias in favor of `useCrossmintAuth`

BREAKING CHANGE: The `useAuth` export has been removed from all packages. Use `useCrossmintAuth` instead, which provides the same functionality.

- `useAuth()` -> `useCrossmintAuth()`
