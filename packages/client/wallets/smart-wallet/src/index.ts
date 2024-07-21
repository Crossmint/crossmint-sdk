export { EVMBlockchainIncludingTestnet as Blockchain, blockchainToChainId } from "@crossmint/common-sdk-base";

export { EVMSmartWallet } from "./blockchain/wallets/EVMSmartWallet";

export type {
    SmartWalletSDKInitParams,
    UserParams,
    Web3AuthSigner,
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
} from "./error";

export { SmartWalletSDK } from "./SmartWalletSDK";
