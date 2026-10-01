export * from "./hooks";
export * from "./providers";
export * from "./components";
export type { NativePasskeyConfig } from "./native/passkey/createNativePasskeyProvider";

export type { CrossmintEvent, CrossmintEventMap } from "@crossmint/client-sdk-base";

export { getIdentityVerificationCredentials } from "@crossmint/client-sdk-base";
export type {
    CrossmintIdentityVerificationProps,
    IdentityVerificationCredentials,
    IdentityVerificationStatus,
    IdentityVerificationError,
} from "@crossmint/client-sdk-base";

export type { SDKExternalUser, OAuthProvider } from "@crossmint/common-sdk-auth";

export type { CrossmintWalletBaseContext, OtpSignerFunctions } from "@crossmint/client-sdk-react-base";

export {
    type Transfers,
    type Balances,
    type Chain,
    type ClientSideWalletArgsFor,
    type ClientSideWalletCreateArgs,
    type Signer,
    type Transaction,
    type Signature,
    EVMWallet,
    SolanaWallet,
    StellarWallet,
    Wallet,
} from "@crossmint/wallets-sdk";
