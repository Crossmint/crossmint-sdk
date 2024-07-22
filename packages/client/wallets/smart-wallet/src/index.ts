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

export type {
    NotAuthorizedError,
    TransferError,
    TransactionError,
    CrossmintServiceError,
    RunningOnServerError,
    SmartWalletSDKError,
} from "./types/Error";

export { SmartWalletSDK } from "./SmartWalletSDK";
