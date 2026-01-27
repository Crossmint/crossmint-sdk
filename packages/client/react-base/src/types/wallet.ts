import type { UIConfig } from "@crossmint/common-sdk-base";
import type { ClientSideWalletCreateArgs, EVMChain, SolanaChain, StellarChain } from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    ClientSideWalletArgsFor,
    ClientSideWalletCreateArgs,
    EvmExternalWalletSignerConfig,
    DelegatedSigner,
    OnCreateConfig,
    SolanaExternalWalletSignerConfig,
    Wallet,
    WalletPlugin,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet, StellarWallet } from "@crossmint/wallets-sdk";

export type CreateOnLogin =
    | ClientSideWalletCreateArgs<SolanaChain>
    | ClientSideWalletCreateArgs<EVMChain>
    | ClientSideWalletCreateArgs<StellarChain>;

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
