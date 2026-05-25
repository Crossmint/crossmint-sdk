---
"@crossmint/wallets-sdk": patch
---

Fix device signer recovery error handling:
- Don't permanently cache `#deviceSignerApproved = true` when recovery fails, which was preventing future recovery attempts from running
- Handle "Already has the required number of approvals" response in `resumePendingDeviceSignerApproval` as a success case instead of throwing
