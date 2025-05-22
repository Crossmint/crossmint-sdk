import type { Chain } from "@/types";
import type { Wallet } from "@/wallet";

export interface Callbacks {
    onWalletCreationStart?: () => Promise<void>;
    onWalletCreationComplete?: (wallet: Wallet<Chain>) => Promise<void>;
    onWalletCreationFail?: (error: Error) => Promise<void>;
    onTransactionStart?: (transaction: Transaction) => Promise<void>;
    onTransactionComplete?: (transaction: Transaction) => Promise<void>;
    onTransactionFail?: (error: Error) => Promise<void>;
}

export interface WalletOptions {
    experimental_callbacks?: Callbacks;
}
