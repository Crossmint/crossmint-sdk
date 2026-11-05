---
"@crossmint/server-sdk": patch
"@crossmint/common-sdk-auth": patch
---

`getSession` returns the user (email, phone number, linked accounts) when it had to refresh the session, since the refresh response already carries it. A server that needs the email can skip `getUser` in that case.
