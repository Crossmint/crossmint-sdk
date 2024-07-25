export { EVMBlockchainIncludingTestnet as Blockchain, blockchainToChainId } from "@crossmint/common-sdk-base";

export { EVMSmartWallet } from "./blockchain/wallets/EVMSmartWallet";

export type {
    SmartWalletSDKInitParams,
    UserParams,
    ViemAccount,
    PasskeySigner,
    EOASigner,
    WalletConfig,
} from "./types/Config";

export type { TransferType, ERC20TransferType, NFTTransferType, SFTTransferType } from "./types/Tokens";

export {
    TransferError,
    CrossmintServiceError,
    SmartWalletSDKError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
    OutOfCreditsError,
} from "./error";

export { SmartWalletSDK } from "./SmartWalletSDK";
