---
"@crossmint/common-sdk-base": patch
"@crossmint/client-sdk-window": patch
"@crossmint/client-sdk-auth": patch
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-ui": patch
"@crossmint/wallets-sdk": patch
---

Fix consoleLogLevel="silent" not suppressing all SDK console output

Replace direct console.* calls across SDK packages with logToConsole utility
that respects the global consoleLogLevel setting from CrossmintProvider.
Previously, only logs routed through SdkLogger were silenced; direct console
calls in auth, wallets, window, and React provider code bypassed the setting.
