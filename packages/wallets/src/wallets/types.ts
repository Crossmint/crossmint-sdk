import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { CreateTransactionSuccessResponse } from "../api";
import type { Chain, EVMSmartWalletChain } from "../chains/chains";
import type { SignerConfigForChain } from "../signers/types";

export type { Activity } from "../api/types";

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

export type DelegatedSigner = {
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

export type WalletArgsFor<C extends Chain> = {
    chain: C;
    signer: SignerConfigForChain<C>;
    owner?: string;
    options?: WalletOptions;
};

export type TokenBalance = {
    symbol: "sol" | "eth" | "usdc" | string;
    name: string;
    amount: string;
    contractAddress?: string;
    decimals?: number;
    rawAmount?: string;
};

export type Balances = {
    nativeToken: TokenBalance;
    usdc: TokenBalance;
    tokens: TokenBalance[];
};

export type UserLocator =
    | { email: string }
    | { x: string }
    | { twitter: string }
    | { phone: string }
    | { userId: string };

export type Transaction = {
    hash: string;
    explorerLink: string;
};
