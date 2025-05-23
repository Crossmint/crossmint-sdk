import type { CrossmintAuthEmbeddedWallets } from "@crossmint/client-sdk-react-base";
import type { EVMSignerInput, SolanaSignerInput } from "@crossmint/wallets-sdk";

export type { GetOrCreateWalletProps, CrossmintAuthEmbeddedWallets } from "@crossmint/client-sdk-react-base";
export type GetOrCreateWalletAdminSigner = EVMSignerInput | SolanaSignerInput | undefined;

export type CreateOnLogin = {
    walletType: CrossmintAuthEmbeddedWallets["type"];
    chain?: string;
    signer?: GetOrCreateWalletAdminSigner;
    owner?: unknown;
};
