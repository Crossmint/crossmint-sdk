import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { CreateTransactionSuccessResponse } from "../api";
import type { EVMSmartWalletChain } from "../chains/chains";

export type { Activity, Balances } from "../api/types";

export interface EVMTransactionInput {
    to: string;
    chain: EVMSmartWalletChain;
    data?: string;
    value?: bigint;
}

export interface SolanaTransactionInput {
    transaction: VersionedTransaction;
    additionalSigners?: Keypair[];
}

export type Permission = {
    signer: string;
};

// Approvals
export type PendingApproval = NonNullable<
    NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]
>[number];

export type Callbacks = {
    onWalletCreationStart?: () => Promise<void>;
    onTransactionStart?: () => Promise<void>;
};

export type WalletOptions = {
    experimental_callbacks?: Callbacks;
};
