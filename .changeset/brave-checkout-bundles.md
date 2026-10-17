---
"@crossmint/client-sdk-react-ui": patch
---

Bundle the checkout's internal browser wallet connectors so SDK consumers no longer install their native image-processing and bigint dependencies or nested vulnerable WebSocket packages. Preserve the existing SDK API, shared React and Crossmint providers, and the public chain dependencies. Include third-party license notices with the browser code.
