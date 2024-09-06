---
"@crossmint/client-sdk-smart-wallet": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-auth-core": patch
---

-   **@crossmint/client-sdk-smart-wallet**: Fixed an issue where checking if running on the client was done too early, causing issues with Next.js. Moved the check to a function call instead.
-   **@crossmint/client-sdk-react-ui**: Updated React version to ^18.3.0.
-   **@crossmint/client-sdk-auth-core**: Updated React version to ^18.3.0. Fixed a hydration error when rendering the auth modal.
