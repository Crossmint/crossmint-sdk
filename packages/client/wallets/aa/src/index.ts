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

export {
    NotAuthorizedError,
    TransferError,
    TransactionError,
    CrossmintServiceError,
    RunningOnServerError,
    WalletSdkError,
} from "./types/Error";

export { SmartWalletSDK } from "./SmartWalletSDK";
