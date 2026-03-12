import type { UIConfig } from "@crossmint/common-sdk-base";
import type { ClientSideWalletCreateArgs, EVMChain, SolanaChain, StellarChain } from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    ClientSideWalletArgsFor,
    ClientSideWalletCreateArgs,
    EvmExternalWalletSignerConfig,
    DelegatedSigner,
    SolanaExternalWalletSignerConfig,
    Wallet,
    WalletPlugin,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

/** Configuration for automatic wallet creation on user login. */
export type CreateOnLogin =
    | ClientSideWalletCreateArgs<SolanaChain>
    | ClientSideWalletCreateArgs<EVMChain>
    | ClientSideWalletCreateArgs<StellarChain>;

export type BaseCrossmintWalletProviderProps = {
    /** Configuration for automatic wallet creation on login. */
    createOnLogin?: CreateOnLogin;
    /** Whether to show passkey helper UI. Default: true. */
    showPasskeyHelpers?: boolean;
    /** Appearance configuration for wallet UI components. */
    appearance?: UIConfig;
};
