import type { CustomEVMAdminSigner, CustomSolanaAdminSigner } from "@/hooks/useDynamicConnect";
import type { EVMSignerInput, SolanaSignerInput } from "@crossmint/wallets-sdk";

export type { GetOrCreateWalletProps, CrossmintAuthEmbeddedWallets } from "@crossmint/client-sdk-react-base";
export type GetOrCreateWalletAdminSigner =
    | CustomEVMAdminSigner
    | CustomSolanaAdminSigner
    | EVMSignerInput
    | SolanaSignerInput
    | undefined;
