---
"@crossmint/client-sdk-react-ui": patch
---

The OAuth login popup accepts its sign-in result only from the Crossmint origin of the configured environment (or `overrideBaseUrl`). Before, it also accepted a result from any other page that was loaded into the popup.
