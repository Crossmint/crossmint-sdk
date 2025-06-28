import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { Abi } from "abitype";
import type { CreateTransactionSuccessResponse } from "../api";

export type { Activity } from "../api/types";

export type EVMTransactionInput =
    | {
          to: string;
          functionName?: string;
          args?: unknown[];
          value?: bigint;
          abi?: Abi;
          data?: `0x${string}`;
      }
    | { transaction: string };

export type FormattedEVMTransaction =
    | {
          to: string;
          value: string;
          data: string;
      }
    | { transaction: string };
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

export type PreparedTransaction = {
    txId: string;
};
