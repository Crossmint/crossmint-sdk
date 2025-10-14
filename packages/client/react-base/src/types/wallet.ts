import type { UIConfig } from "@crossmint/common-sdk-base";
import type { EVMChain, SolanaChain, StellarChain, WalletCreateArgs } from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    EvmExternalWalletSignerConfig,
    DelegatedSigner,
    OnCreateConfig,
    SolanaExternalWalletSignerConfig,
    Wallet,
    WalletPlugin,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

export type CreateOnLogin = WalletCreateArgs<SolanaChain> | WalletCreateArgs<EVMChain> | WalletCreateArgs<StellarChain>;

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
