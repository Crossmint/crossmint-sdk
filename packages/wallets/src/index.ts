// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

// Errors
export { WalletNotAvailableError, InvalidTransferAmountError } from "./utils/errors";

// API
export { ApiClient as WalletsApiClient, type RegisterSignerPasskeyParams, type Scope, type TransferScope } from "./api";

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
    ApproveParams,
    ApproveOptions,
    AddSignerOptions,
    RemoveSignerOptions,
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
    DerivedServerSigner,
} from "./signers/types";

// Server signer
export { createServerSigner } from "./utils/server-signers";
export type { CreateServerSignerParams, ServerSigner } from "./utils/server-signers";
export { deriveKeyBytes, deriveAlias } from "./utils/server-key-derivation";
export { deriveServerSignerAddress, deriveServerSignerDetails } from "./signers/server/helpers/derive-server-signer";

// Device Signer Key Storage Interface
export { DeviceSignerKeyStorage, IframeDeviceSignerKeyStorage, createDeviceSigner } from "./utils/device-signers";
export type { BiometricRequestHandler } from "./utils/device-signers";
