---
"@crossmint/server-sdk": patch
---

JWT verification no longer waits for the JWKS to be re-downloaded every 10 minutes: the keys are refreshed in the background while verification keeps using the current ones. If the JWKS endpoint keeps failing, keys stay in use for up to an hour; a token signed with an unknown key still waits for a download, as before.
