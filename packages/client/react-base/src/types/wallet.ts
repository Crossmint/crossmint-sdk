import type { Chain, SignerConfigForChain } from "@crossmint/wallets-sdk";

export type CrossmintAuthEmbeddedWallets = {
    createOnLogin: "all-users" | "off";
    showPasskeyHelpers?: boolean;
    chain: Chain;
    owner?: string;
    signer?: SignerConfigForChain<Chain>;
};
