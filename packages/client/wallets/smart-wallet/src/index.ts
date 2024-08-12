export { blockchainToChainId, EVMBlockchainIncludingTestnet as Chain } from "@crossmint/common-sdk-base";

export { EVMSmartWallet } from "./blockchain/wallets/EVMSmartWallet";

export type {
    SmartWalletSDKInitParams,
    UserParams,
    ViemAccount,
    PasskeySigner,
    EOASigner,
    WalletParams,
} from "./types/Config";

export type { TransferType, ERC20TransferType, NFTTransferType, SFTTransferType } from "./types/Tokens";

export {
    SmartWalletError,
    UserWalletAlreadyCreatedError,
    OutOfCreditsError,
    AdminAlreadyUsedError,
    AdminMismatchError,
    PasskeyMismatchError,
    PasskeyPromptError,
    PasskeyRegistrationError,
    PasskeyIncompatibleAuthenticatorError,
    ConfigError,
    NonCustodialWalletsNotEnabledError,
} from "./error";

export { SmartWalletErrorCode } from "@crossmint/client-sdk-base";

export { SmartWalletSDK } from "./SmartWalletSDK";
