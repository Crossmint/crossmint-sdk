import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { CreateTransactionSuccessResponse } from "../api";
import type { EVMSmartWalletChain } from "../chains/chains";

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
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
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
