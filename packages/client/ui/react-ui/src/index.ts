export * from "./components";
export * from "./hooks";
export * from "./providers";

export { CrossmintEvents, useCrossmintEvents } from "@crossmint/client-sdk-base";
export {
    type EVMSmartWallet,
    Chain,
    SmartWalletError,
    UserWalletAlreadyCreatedError,
    AdminAlreadyUsedError,
    AdminMismatchError,
    PasskeyMismatchError,
    PasskeyPromptError,
    PasskeyRegistrationError,
    PasskeyIncompatibleAuthenticatorError,
    ConfigError,
    SmartWalletsNotEnabledError,
    EVMSendTransactionError,
    EVMSendTransactionExecutionRevertedError,
} from "@crossmint/client-sdk-smart-wallet";
export type { CrossmintEvent, CrossmintEventMap } from "@crossmint/client-sdk-base";
