export { blockchainToChainId, EVMBlockchainIncludingTestnet as Chain } from "@crossmint/common-sdk-base";

export { EVMSmartWallet } from "./blockchain/wallets/EVMSmartWallet";

export type {
    SmartWalletSDKInitParams,
    UserParams,
    ViemAccount,
    PasskeySigner,
    ExternalSigner,
    WalletParams,
} from "./types/params";

export type { SmartWalletChain as EVMSmartWalletChain } from "./blockchain/chains";

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
    EVMSendTransactionError,
    EVMSendTransactionExecutionRevertedError,
} from "./blockchain/wallets/SendTransactionService";

export {
    SmartWalletErrorCode,
    CrossmintSDKError,
    CrossmintServiceError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
} from "@crossmint/client-sdk-base";

export { SmartWalletSDK } from "./SmartWalletSDK";
