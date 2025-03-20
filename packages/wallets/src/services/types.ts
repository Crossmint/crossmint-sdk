import type { EVMSmartWallet, EVMSignerInput } from "@/evm/wallet";
import type { SolanaSmartWallet, SolanaMPCWallet } from "@/solana/wallet";
import type { EVMSmartWalletChain } from "@/evm/chains";
import type { SolanaSignerInput } from "@/solana/types/signers";

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
        chain: EVMSmartWalletChain;
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
