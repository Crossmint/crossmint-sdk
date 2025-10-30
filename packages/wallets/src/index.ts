// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

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
    DelegatedSigner,
    EVMTransactionInput,
    Transaction,
    WalletArgsFor,
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
} from "./signers/types";
