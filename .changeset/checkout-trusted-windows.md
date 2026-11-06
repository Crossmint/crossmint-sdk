---
"@crossmint/client-sdk-react-ui": patch
"@crossmint/client-sdk-base": patch
---

`CrossmintCheckoutProvider` now accepts order updates only from the checkout window that the SDK opened, and ignores updates with a bad shape. The hosted checkout service's `createWindow` now returns the window it opens.
