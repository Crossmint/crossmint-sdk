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

export type CrossmintAuthEmbeddedWallets = {
    createOnLogin: "all-users" | "off";
    showPasskeyHelpers?: boolean;
    chain: Chain;
    owner?: string;
    signer?: SignerConfigForChain<Chain>;
};
