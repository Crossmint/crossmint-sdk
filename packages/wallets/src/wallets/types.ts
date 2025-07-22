import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { Abi } from "abitype";
import type { CreateTransactionSuccessResponse } from "../api";
import type { Chain } from "../chains/chains";
import type { SignerConfigForChain, Signer, BaseSignResult, PasskeySignResult } from "../signers/types";

export type { Activity } from "../api/types";

export type TransactionInputOptions = {
    experimental_prepareOnly?: boolean;
    experimental_signer?: string;
};

type EVMTransactionInputBase = {
    options?: TransactionInputOptions;
};

export type EVMTransactionInput = EVMTransactionInputBase &
    (
        | {
              to: string;
              functionName?: string;
              args?: unknown[];
              value?: bigint;
              abi?: Abi;
              data?: `0x${string}`;
          }
        | { transaction: string }
    );

export type SolanaTransactionInput = {
    transaction: VersionedTransaction;
    additionalSigners?: Keypair[];
    options?: TransactionInputOptions;
};

export type FormattedEVMTransaction =
    | {
          to: string;
          value: string;
          data: string;
      }
    | { transaction: string };

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

export type Transaction<TPrepareOnly extends boolean = false> = TPrepareOnly extends true
    ? {
          hash?: string;
          explorerLink?: string;
          transactionId: string;
      }
    : {
          hash: string;
          explorerLink: string;
          transactionId: string;
      };

export type ApproveOptions = {
    experimental_approval?: Approval;
    additionalSigners?: Signer[];
};

export type ApproveParams = {
    transactionId?: string;
    signatureId?: string;
    options?: ApproveOptions;
};

export type Approval = (BaseSignResult | PasskeySignResult) & {
    signer: string;
};
