// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

// Errors
export { WalletNotAvailableError } from "./utils/errors";

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
    DelegatedSigner,
    SignerStatus,
    DeviceSignerDescriptor,
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
export { isExportableSigner } from "./signers/types";
export { signWithPasskey } from "./signers/passkey";
export type {
    EmailSignerConfig,
    PhoneSignerConfig,
    PasskeySignerConfig,
    PasskeySignResult,
    EvmExternalWalletSignerConfig,
    ExternalWalletSignerConfigForChain,
    ServerSignerConfig,
    SignerConfigForChain,
    SignerLocator,
    EmailSignerLocator,
    PhoneSignerLocator,
    PasskeySignerLocator,
    DeviceSignerLocator,
    ExternalWalletSignerLocator,
    ApiKeySignerLocator,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
    ExportableSigner,
    ExportSignerTEEConnection,
    Signer,
} from "./signers/types";

// Device Signer Key Storage Interface
export { DeviceSignerKeyStorage, IframeDeviceSignerKeyStorage, createDeviceSigner } from "./utils/device-signers";
export type { BiometricRequestHandler } from "./utils/device-signers";
