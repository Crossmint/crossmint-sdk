---
"@crossmint/wallets-sdk": patch
---

fix: prevent duplicate TEE initialization race condition in NonCustodialSigner

Stores the constructor's initialize() promise in _initializationPromise so that
getTEEConnection() can detect an in-flight initialization and await it instead
of starting a parallel one, preventing duplicate iframe/TEE attestation.
