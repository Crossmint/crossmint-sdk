import type { EVMSignerInput } from "@/evm/types/signers";
import type { EVMSmartWallet } from "@/evm/types/wallet";
import type { SolanaSignerInput } from "@/solana/types/signers";
import type { SolanaSmartWallet, SolanaMPCWallet } from "@/solana/types/wallet";

export type EvmWalletType = "evm-smart-wallet";
export type SolanaWalletType = "solana-smart-wallet" | "solana-mpc-wallet";
export type WalletType = EvmWalletType | SolanaWalletType;

export type WalletTypeToWallet = {
    "evm-smart-wallet": EVMSmartWallet;
    "solana-smart-wallet": SolanaSmartWallet;
    "solana-mpc-wallet": SolanaMPCWallet;
};

export type WalletTypeToArgs = {
    "evm-smart-wallet": {
        adminSigner: EVMSignerInput;
        linkedUser?: string;
    };
    "solana-smart-wallet": {
        adminSigner?: SolanaSignerInput;
        linkedUser?: string;
    };
    "solana-mpc-wallet": {
        linkedUser: string;
    };
};
