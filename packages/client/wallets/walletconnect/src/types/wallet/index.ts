import type {
    GetAddress,
    GetSupportedChains,
    SendEthersTransaction,
    SignMessage,
    SignSolanaTransaction,
    SignTypedData,
} from "./features";

export type CrossmintWalletConnectCommonWallet = SignMessage & GetSupportedChains & GetAddress;
export type CrossmintWalletConnectEVMWallet = CrossmintWalletConnectCommonWallet &
    SendEthersTransaction &
    SignTypedData;
export type CrossmintWalletConnectSolanaWallet = CrossmintWalletConnectCommonWallet & SignSolanaTransaction;

export type CrossmintWalletConnectWallet = CrossmintWalletConnectEVMWallet | CrossmintWalletConnectSolanaWallet;
