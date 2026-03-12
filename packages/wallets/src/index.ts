// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

// Errors
export { WalletNotAvailableError } from "./utils/errors";

// API
export { ApiClient as WalletsApiClient } from "./api";

// Wallets
export { Wallet } from "./wallets/wallet";
export { SolanaWallet } from "./wallets/solana";
export { EVMWallet } from "./wallets/evm";
export { StellarWallet } from "./wallets/stellar";

// Core types
export type {
    Activity,
    Balances,
    ClientSideWalletArgsFor,
    ClientSideWalletCreateArgs,
    DelegatedSigner,
    DeviceSignerDescriptor,
    EVMTransactionInput,
    Transaction,
    WalletArgsFor,
    WalletCreateArgs,
    WalletPlugin,
    Signature,
    SolanaTransactionInput,
} from "./wallets/types";
export type { Chain, EVMChain, SolanaChain, StellarChain } from "./chains/chains";

// Signer configuration types
export { isExportableSigner } from "./signers/types";
export type {
    EmailSignerConfig,
    PhoneSignerConfig,
    EvmExternalWalletSignerConfig,
    ExternalWalletSignerConfigForChain,
    SignerConfigForChain,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
    ExportableSigner,
    ExportSignerTEEConnection,
    Signer,
} from "./signers/types";

// Device Signer Key Storage Interface
export { DeviceSignerKeyStorage, IframeDeviceSignerKeyStorage, createDeviceSigner } from "./utils/device-signers";
