---
"@crossmint/wallets-sdk": patch
---

`wallet.addSigner({ type: "passkey" })` and `wallet.addRecoveryMethod({ type: "passkey" })` now create the passkey
when the config has no credential id, using the config's `onCreatePasskey`, else the wallet's `passkeyProvider`,
else the browser WebAuthn API, and register its id and public key. Before, the SDK looked up a signer named
`passkey` and sent the bare config, which the API rejected. A config with a credential id is registered as before,
and the request body now carries only the passkey fields the API takes.
