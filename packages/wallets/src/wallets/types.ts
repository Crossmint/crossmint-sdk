import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { TypedData, TypedDataDefinition } from "viem";
import type { Abi } from "abitype";
import type { CreateTransactionSuccessResponse } from "../api";
import type { Chain, EVMSmartWalletChain, StellarChain } from "../chains/chains";
import type { SignerConfigForChain, Signer, BaseSignResult, PasskeySignResult } from "../signers/types";
import type { ShadowSignerStorage } from "../signers/shadow-signer";

export type { Activity } from "../api/types";

export type PrepareOnly<T extends boolean = boolean> = { experimental_prepareOnly: T };

export type TransactionInputOptions = PrepareOnly & {
    experimental_signer?: string;
};

export type SignatureInputOptions = PrepareOnly;

export type AddDelegatedSignerOptions = PrepareOnly;

export type AddDelegatedSignerReturnType<C extends Chain> = C extends "solana" | "stellar"
    ? { transactionId: string }
    : { signatureId: string };

export type SignMessageInput = {
    message: string;
    options?: SignatureInputOptions;
};

export type SignTypedDataInput = TypedDataDefinition<TypedData, string> & {
    chain: EVMSmartWalletChain;
    options?: SignatureInputOptions;
};

export type ApproveResult<T extends ApproveParams> = T extends { transactionId: string }
    ? Transaction<false>
    : T extends { signatureId: string }
      ? Signature<false>
      : Error;

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

export type StellarTransactionInput = (
    | {
          contractId: string;
          method: string;
          memo?: string;
          args: Record<string, any>;
      }
    | {
          transaction: string;
          contractId: string;
      }
) & {
    options?: TransactionInputOptions;
};

export type SolanaTransactionInput = (
    | {
          transaction: VersionedTransaction;
      }
    | {
          serializedTransaction: string;
      }
) & {
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

export type OnCreateConfig<C extends Chain> = {
    adminSigner: SignerConfigForChain<C>;
    delegatedSigners?: Array<SignerConfigForChain<C>>;
};

// Approvals
export type PendingApproval = NonNullable<
    NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]
>[number];

export type Callbacks = {
    onWalletCreationStart?: () => Promise<void>;
    onTransactionStart?: () => Promise<void>;
};

export type StellarWalletPlugin = string;

export type WalletPlugin<C extends Chain> = C extends StellarChain ? StellarWalletPlugin : never;

export type WalletOptions = {
    experimental_callbacks?: Callbacks;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    shadowSignerStorage?: ShadowSignerStorage;
    shadowSignerEnabled?: boolean;
};

export type WalletArgsFor<C extends Chain> = {
    chain: C;
    signer: SignerConfigForChain<C>;
    owner?: string;
    plugins?: WalletPlugin<C>[];
    options?: WalletOptions;
};

export type WalletCreateArgs<C extends Chain> = WalletArgsFor<C> & {
    onCreateConfig?: OnCreateConfig<C>;
};

type ChainExtras = {
    solana: { mintHash?: string };
    stellar: { contractId?: string };
    evm: { contractAddress?: string };
};

type ChainToExtrasKey<C extends Chain> = C extends "solana" ? "solana" : C extends "stellar" ? "stellar" : "evm";

export type TokenBalance<C extends Chain = Chain> = {
    symbol: "sol" | "eth" | "usdc" | string;
    name: string;
    amount: string;
    decimals?: number;
    rawAmount?: string;
} & ChainExtras[ChainToExtrasKey<C>];

export type Balances<C extends Chain = Chain> = {
    nativeToken: TokenBalance<C>;
    usdc: TokenBalance<C>;
    tokens: TokenBalance<C>[];
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

export type Signature<TPrepareOnly extends boolean = false> = TPrepareOnly extends true
    ? {
          signature?: string;
          signatureId: string;
      }
    : {
          signature: string;
          signatureId: string;
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
