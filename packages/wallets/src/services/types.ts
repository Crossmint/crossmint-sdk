import type { EVMSmartWallet, EVMMPCWallet, EVMSignerInput } from "@/evm/wallet";
import type { SolanaSmartWallet, SolanaMPCWallet } from "@/solana/wallet";
import type { EVMSmartWalletChain } from "@/evm/chains";
import type { SolanaSignerInput } from "@/solana/types/signers";
import type { GetWalletResponse } from "@/api";

export type EvmWalletType = "evm-smart-wallet" | "evm-mpc-wallet";
export type SolanaWalletType = "solana-smart-wallet" | "solana-mpc-wallet";
export type WalletType = EvmWalletType | SolanaWalletType;

export type WalletTypeToWallet = {
    "evm-smart-wallet": EVMSmartWallet;
    "evm-mpc-wallet": EVMMPCWallet;
    "solana-smart-wallet": SolanaSmartWallet;
    "solana-mpc-wallet": SolanaMPCWallet;
};

export type WalletTypeToArgs = {
    "evm-smart-wallet": {
        chain: EVMSmartWalletChain;
        adminSigner: EVMSignerInput;
        linkedUser?: string;
    };
    "evm-mpc-wallet": {
        chain: EVMSmartWalletChain;
        linkedUser: string;
    };
    "solana-smart-wallet": {
        adminSigner?: SolanaSignerInput;
        linkedUser?: string;
    };
    "solana-mpc-wallet": {
        linkedUser: string;
    };
};

export type WalletTypeToWalletData = {
    "evm-smart-wallet": Extract<GetWalletResponse, { type: "evm-smart-wallet" }>;
    "evm-mpc-wallet": Extract<GetWalletResponse, { type: "evm-mpc-wallet" }>;
    "solana-smart-wallet": Extract<GetWalletResponse, { type: "solana-smart-wallet" }>;
    "solana-mpc-wallet": Extract<GetWalletResponse, { type: "solana-mpc-wallet" }>;
};
