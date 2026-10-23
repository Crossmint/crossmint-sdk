---
"@crossmint/client-sdk-react-ui": patch
---

Parse the embedded checkout's Solana transaction with `VersionedTransaction.deserialize` instead of the legacy `Transaction.from`. The legacy parser rejects every versioned transaction — a version-0 payload failed with `Versioned messages must be deserialized with VersionedMessage.deserialize()`, surfacing to the buyer as "Failed to deserialize transaction". `VersionedTransaction.deserialize` accepts legacy and version-0 alike, and Dynamic's `signAndSendTransaction` accepts either object. Legacy payloads keep working, and now reach the wallet as a `VersionedTransaction` whose `message.version` is `"legacy"`.
