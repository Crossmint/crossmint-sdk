---
"@crossmint/wallets-sdk": patch
"@crossmint/client-sdk-react-base": patch
"@crossmint/client-sdk-react-native-ui": patch
---

Quorum signer QA fixes: a quorum with a missing `members` list or an unsupported member type throws `InvalidRecoveryConfigError` instead of a `TypeError` or a `null` member; a server member the API lists as `external-wallet` matches its quorum, so `createWallet` no longer throws for a wallet it just created; `useRecoveryMethod` rereads the wallet's recovery quorums when it does not find a member locally; a key that does not sign an approval within 5 minutes throws `ApprovalSigningTimeoutError` instead of blocking later approvals. In the React and React Native providers, wallet errors keep the SDK error `code`, only fetch failures count as `network`, two `createWallet` calls in the same tick send one request, and an email, phone or passkey member of a recovery quorum starts the WebView or passkey setup like a top-level recovery method does.
