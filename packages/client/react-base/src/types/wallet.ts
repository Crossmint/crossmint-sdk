import type { UIConfig } from "@crossmint/common-sdk-base";
import type { Chain, SignerConfigForChain } from "@crossmint/wallets-sdk";

export type {
    Balances,
    Chain,
    EvmExternalWalletSignerConfig,
    Permission,
    SolanaExternalWalletSignerConfig,
    Wallet,
} from "@crossmint/wallets-sdk";

export { EVMWallet, SolanaWallet } from "@crossmint/wallets-sdk";

export type CreateOnLogin = {
    chain: Chain;
    signer?: SignerConfigForChain<Chain>;
    owner?: string;
};

export type BaseCrossmintWalletProviderProps = {
    createOnLogin?: CreateOnLogin;
    showPasskeyHelpers?: boolean;
    appearance?: UIConfig;
};
