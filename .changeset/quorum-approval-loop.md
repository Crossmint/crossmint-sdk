---
"@crossmint/wallets-sdk": minor
---

Teach the approval loop the nested `quorumApprovals` shape. A quorum entry in `approvals.pending` no longer throws `QuorumSignerNotSupportedError`: the loop descends into `quorumApprovals.pending`, signs each member's own message with the signer this client holds (member locator in the submission), and skips members it cannot sign — other holders approve independently and the API tracks progress against the threshold, so re-approving after a member already submitted is a no-op instead of an error. The Solana ed25519 special case (signing `onChain.transaction` instead of the member message) applies per member, and when the same signer covers several pending messages in one call each approval carries its `message` so the API can tell them apart. Flat (pre-quorum) approval entries are handled byte-for-byte as before.
