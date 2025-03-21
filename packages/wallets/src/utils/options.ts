import type { EVMSmartWallet, TransactionInput as EVMTransaction } from "@/evm";
import type { SolanaMPCWallet, SolanaSmartWallet, Transaction as SolanaTransaction } from "@/solana";

export type Wallet = EVMSmartWallet | SolanaSmartWallet | SolanaMPCWallet;
export type Transaction = EVMTransaction | SolanaTransaction;

export interface Callbacks {
    onWalletCreationStart?: () => Promise<void>;
    onWalletCreationComplete?: (wallet: Wallet) => Promise<void>;
    onWalletCreationFail?: (error: Error) => Promise<void>;
    onTransactionStart?: (transaction: Transaction) => Promise<void>;
    onTransactionComplete?: (transaction: Transaction) => Promise<void>;
    onTransactionFail?: (error: Error) => Promise<void>;
}

export interface WalletOptions {
    experimental_callbacks?: Callbacks;
}
