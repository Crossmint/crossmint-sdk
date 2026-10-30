---
"@crossmint/wallets-sdk": patch
"@crossmint/common-sdk-base": patch
---

Stop leaking server signer secrets through wallet signer-config mismatch errors. `compareSignerConfigs` no longer compares or echoes `secret` fields (or runtime callbacks), and its error message names only the mismatching field. The SDK logger now also scrubs known secret shapes (server signer master secrets, JWTs, Crossmint API keys) from error messages, stack traces and log messages before they reach the log sinks.
