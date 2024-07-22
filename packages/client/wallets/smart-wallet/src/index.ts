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

export {
    NotAuthorizedError,
    TransferError,
    TransactionError,
    CrossmintServiceError,
    RunningOnServerError,
    SmartWalletSDKError,
    PasskeyPromptError,
} from "./error";

export { SmartWalletSDK } from "./SmartWalletSDK";
