export { blockchainToChainId, EVMBlockchainIncludingTestnet as Chain } from "@crossmint/common-sdk-base";

export { EVMSmartWallet } from "./blockchain/wallets/EVMSmartWallet";

export type {
    WalletSDKInitParams,
    UserParams,
    ViemAccount,
    PasskeySigner,
    EOASigner,
    WalletParams,
} from "./types/params";

export type { TransferType, ERC20TransferType, NFTTransferType, SFTTransferType } from "./types/token";

export {
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
} from "./error";

export {
    SmartWalletErrorCode,
    CrossmintSDKError,
    CrossmintServiceError,
    TransferError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
} from "@crossmint/client-sdk-base";

export { WalletSDK } from "./WalletSDK";
