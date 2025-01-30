export { blockchainToChainId, EVMBlockchainIncludingTestnet as Chain } from "@crossmint/common-sdk-base";

export type { ViemAccount, PasskeySigner, ExternalSigner, WalletParams, UserParams } from "./smartWalletService";
export type { SmartWalletChain as EVMSmartWalletChain } from "./evm/chains";
export type { TransferType, ERC20TransferType, NFTTransferType, SFTTransferType } from "./evm/transfer";
export type { SmartWalletSDKInitParams } from "./sdk";

export { EVMSmartWallet } from "./evm/wallet";
export { SmartWalletSDK } from "./sdk";
