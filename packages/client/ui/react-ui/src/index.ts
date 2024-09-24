import { install } from "@twind/core";

import twindConfig from "./twind.config";

// Initialize twind with custom configuration
// This sets up the CSS-in-JS styling solution for the entire application
install(twindConfig);

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
