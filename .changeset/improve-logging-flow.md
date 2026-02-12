---
"@crossmint/client-sdk-window": patch
"@crossmint/client-sdk-rn-window": patch
"@crossmint/wallets-sdk": patch
---

Improve logging across approve/send transaction flow: remove verbose console.log noise from EventEmitter/Handshake/Transport layers, replace console.warn/error with structured walletsLogger in NCS signers, add timing for TEE operations
