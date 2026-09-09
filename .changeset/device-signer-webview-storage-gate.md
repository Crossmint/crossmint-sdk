---
"@crossmint/wallets-sdk": patch
---

Refine the device signer's browser support check so embedded Chromium runtimes are correctly treated as unsupported. The device signer requires third-party storage partitioning, but `hasPartitionedStorage()` keyed only on the `Chrome/<version>` token, so Android WebView and Electron were reported as supported despite not providing it.

Android WebView is now detected via the `; wv` token, which covers Android in-app browsers (Facebook, Instagram, TikTok, LinkedIn, …) as a class since each one is a WebView. `Electron/` is detected too. Constructing a device signer in these environments now throws `UnsupportedBrowserError` naming the runtime, instead of proceeding. iOS in-app browsers are unaffected — they are WKWebView, which partitions.
