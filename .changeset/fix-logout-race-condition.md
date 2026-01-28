---
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Fix race condition in logout flow that could expose user wallet data between sessions (WAL-8054)

- Make logout() return a Promise so apps can await completion
- Clear JWT and user state synchronously before async logout operation to prevent race conditions
- Maintains backward compatibility for existing code that doesn't await logout
