---
"@crossmint/client-sdk-base": minor
"@crossmint/client-sdk-react-ui": minor
---

Agent checkouts can run on your own browser: pass `browser: { cdp: { url, headers? } }` when creating a checkout and Universal Checkout drives that browser over the Chrome DevTools Protocol instead of a Crossmint-run one. It connects and disconnects but never launches or closes your browser, and the URL and headers are never returned.
