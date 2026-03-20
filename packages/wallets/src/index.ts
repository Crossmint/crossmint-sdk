// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

// Errors
export { WalletNotAvailableError, InvalidTransferAmountError } from "./utils/errors";

// API
export { ApiClient as WalletsApiClient, type RegisterSignerPasskeyParams } from "./api";

// Wallets
export { Wallet } from "./wallets/wallet";
export { SolanaWallet } from "./wallets/solana";
export { EVMWallet } from "./wallets/evm";
export { StellarWallet } from "./wallets/stellar";

// Core types
export type {
    Transfers,
    Balances,
    ClientSideWalletArgsFor,
    ClientSideWalletCreateArgs,
    Signer,
    SignerStatus,
    EVMTransactionInput,
    Transaction,
    WalletArgsFor,
    WalletCreateArgs,
    Callbacks,
    WalletOptions,
    WalletPlugin,
    Signature,
    SolanaTransactionInput,
} from "./wallets/types";
export type { Chain, EVMChain, SolanaChain, StellarChain } from "./chains/chains";

// Signer configuration types
export { isExportableSignerAdapter } from "./signers/types";
export type {
    SignerAdapter,
    EmailSignerConfig,
    PhoneSignerConfig,
    ExternalWalletSignerConfig,
    ExternalWalletRegistrationConfig,
    EvmExternalWalletSignerConfig,
    ExternalWalletSignerConfigForChain,
    ServerSignerConfig,
    SignerConfigForChain,
    SignerLocator,
    EmailSignerLocator,
    PhoneSignerLocator,
    PasskeySignerLocator,
    DeviceSignerLocator,
    DeviceSignerConfig,
    ExternalWalletSignerLocator,
    ApiKeySignerLocator,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
    ExportableSignerAdapter,
    ExportSignerTEEConnection,
} from "./signers/types";

// Device Signer Key Storage Interface
export { DeviceSignerKeyStorage, IframeDeviceSignerKeyStorage, createDeviceSigner } from "./utils/device-signers";
export type { BiometricRequestHandler } from "./utils/device-signers";
