---
"@crossmint/client-sdk-react-base": minor
"@crossmint/client-sdk-react-native-ui": minor
---

Make the React providers quorum-recovery aware. All recovery checks now descend into quorum `methods`: the React Native WebView initializes when a quorum contains an email/phone member, passkey helper UI shows for a passkey quorum member, wallet creation waits for external-wallet quorum members missing an `address`, and the logged-in user's email is auto-filled into a quorum email member (only when exactly one email member is missing its address). On React Native, passkey members inside a quorum are now rejected with the same clear error as flat passkey signers. Adds `recoverySigners`, `recoveryNeedsEmailAutoFill`, and `fillRecoveryEmail` utilities to `@crossmint/client-sdk-react-base`.
