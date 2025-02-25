export {
    blockchainToChainId,
    EVMBlockchainIncludingTestnet as Chain,
} from "@crossmint/common-sdk-base";

// Types
export type {
    ViemAccount,
    PasskeySigner,
    ExternalSigner,
    WalletParams,
    UserParams,
} from "./smartWalletService";
export type { SmartWalletChain as EVMSmartWalletChain } from "./evm/chains";
export type {
    TransferType,
    ERC20TransferType,
    NFTTransferType,
    SFTTransferType,
} from "./types/transfer";
export type { SmartWalletSDKInitParams } from "./sdk";

// Errors
export {
    SmartWalletError,
    InvalidApiKeyError,
    WalletCreationError,
    InvalidChainError,
    InvalidTransferChainError,
    InvalidMessageFormatError,
    MessageSigningError,
    InvalidTypedDataError,
    TypedDataSigningError,
    TransactionApprovalError,
    TransactionFailedError,
    TransactionNotFoundError,
} from "./error";

// Entry point
export { EVMSmartWallet } from "./evm/wallet";
export { SmartWalletSDK } from "./sdk";
