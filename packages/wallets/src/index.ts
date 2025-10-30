// SDK
export { createCrossmint, CrossmintWallets } from "./sdk";

// API
export { ApiClient as WalletsApiClient } from "./api";

// Types
export type { ShadowSignerStorage, ShadowSignerData } from "./signers/shadow-signer/utils";

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
    OnCreateConfig,
    Transaction,
    WalletArgsFor,
    WalletCreateArgs,
    WalletPlugin,
    Signature,
    SolanaTransactionInput,
} from "./wallets/types";
export type { Chain, EVMChain, SolanaChain, StellarChain } from "./chains/chains";

// Signer configuration types
export type {
    EmailSignerConfig,
    PhoneSignerConfig,
    EvmExternalWalletSignerConfig,
    ExternalWalletSignerConfigForChain,
    SignerConfigForChain,
    SolanaExternalWalletSignerConfig,
    StellarExternalWalletSignerConfig,
} from "./signers/types";
