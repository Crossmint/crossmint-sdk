export * from "./sdk";
export * from "./utils/errors";
export * from "./wallets/wallet";
export * from "./wallets/wallet-factory";
export * from "./wallets/solana";
export * from "./wallets/evm";
export * from "./wallets/types";
export * from "./chains/chains";
export * from "./signers/types";

/**
    Activity,
    Balances,
    Chain,
    CrossmintWallets,
    EmailInternalSignerConfig,
    EvmExternalWalletSignerConfig,
    EVMWallet,
    PasskeySignerConfig,
    DelegatedSigner,
    SignerConfigForChain,
    SolanaExternalWalletSignerConfig,
    SolanaWallet,
    Wallet,
    WalletArgsFor
 */

// TODO:
// 1. rename updatePermissions to addDelegatedSigner, and permissions to delegatedSigners.
// 2.
