import { VersionedTransaction } from "@solana/web3.js";
import { CreateTransactionSuccessResponse } from "../api";
import { EVMSmartWalletChain } from "../chains/chains";

export interface EVMTransactionInput {
    to: string;
    chain: EVMSmartWalletChain;
    data?: string;
    value?: bigint;
}

export interface SolanaTransactionInput {
    versionedTransaction: VersionedTransaction;
}

export type Permission = {
    to: string;
};

// Approvals
export type PendingApproval = NonNullable<
    NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]
>[number];
