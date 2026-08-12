---
"@crossmint/client-sdk-react-base": patch
---

Map Crossmint's custom Cloudflare geoblock page (`Crossmint does not work in the following countries and regions`) to the `region-blocked` error code in `useWallet`, instead of treating it as `unknown`.