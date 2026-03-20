import type { Keypair, VersionedTransaction } from "@solana/web3.js";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { TypedData, TypedDataDefinition } from "viem";
import type { Abi } from "abitype";
import type { CreateTransactionSuccessResponse } from "../api";
import type { Chain, EVMSmartWalletChain, StellarChain } from "../chains/chains";
import type {
    SignerConfigForChain,
    ExternalWalletRegistrationConfig,
    Signer as CryptoSigner,
    BaseSignResult,
    PasskeySignResult,
    DeviceSignResult,
    DeviceSignerConfig,
    DeviceSignerLocator,
    ServerSignerConfig,
} from "../signers/types";
import type { DeviceSignerKeyStorage } from "@/utils/device-signers/DeviceSignerKeyStorage";

export type { Transfers } from "../api/types";

export type PrepareOnly<T extends boolean = boolean> = {
    prepareOnly: T;
};

export type SendTokenTransactionType = "onramp" | "regulated-transfer" | "direct";

export type TransactionInputOptions = PrepareOnly & {
    signer?: string | ServerSignerConfig;
};

export type SendTokenTransactionOptions = TransactionInputOptions & {
    transactionType?: SendTokenTransactionType;
};

export type SignatureInputOptions = PrepareOnly;

export type AddSignerOptions = PrepareOnly;

export type AddSignerReturnType<C extends Chain> = C extends "solana" | "stellar"
    ? Signer & { transactionId: string }
    : Signer & { signatureId?: string };

export type SignMessageInput = {
    message: string;
    options?: SignatureInputOptions;
};

export type SignTypedDataInput = TypedDataDefinition<TypedData, string> & {
    chain: EVMSmartWalletChain;
    options?: SignatureInputOptions;
};

export type ApproveResult<T extends ApproveParams> = T extends {
    transactionId: string;
}
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
          args: Record<string, unknown>;
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

export type SignerStatus = "success" | "pending" | "awaiting-approval" | "failed";

export type SignerInput = {
    signer: string | ServerSignerConfig;
};

export type Signer =
    | {
          type: "passkey";
          id: string;
          name: string;
          publicKey: { x: string; y: string };
          validatorContractVersion: string;
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "api-key";
          address: string;
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "external-wallet";
          address: string;
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "email";
          email: string;
          address: string;
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "phone";
          phone: string;
          address: string;
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "device";
          publicKey: { x: string; y: string };
          locator: string;
          status: SignerStatus;
      }
    | {
          type: "server";
          address: string;
          locator: string;
          status: SignerStatus;
      };

// Approvals
export type PendingApproval = NonNullable<
    NonNullable<CreateTransactionSuccessResponse["approvals"]>["pending"]
>[number];

export type Callbacks = {
    onWalletCreationStart?: () => Promise<void>;
    onTransactionStart?: () => Promise<void>;
    onAuthRequired?: (
        signerType: "email" | "phone",
        signerLocator: string,
        needsAuth: boolean,
        sendOtp: () => Promise<void>,
        verifyOtp: (otp: string) => Promise<void>,
        reject: () => void
    ) => Promise<void>;
};

export type StellarWalletPlugin = string;

export type WalletPlugin<C extends Chain> = C extends StellarChain ? StellarWalletPlugin : never;

export type WalletOptions = {
    callbacks?: Callbacks;
    clientTEEConnection?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
    deviceSignerKeyStorage?: DeviceSignerKeyStorage;
};

export type WalletArgsFor<C extends Chain> = {
    /** The blockchain to create the wallet on (e.g. "base-sepolia"). */
    chain: C;
    /** Optional owner identifier. */
    owner?: string;
    /** Optional array of wallet plugins. */
    plugins?: WalletPlugin<C>[];
    options?: WalletOptions;
    /** Optional wallet alias. */
    alias?: string;
};

export type WalletCreateArgs<C extends Chain> = WalletArgsFor<C> & {
    /** Recovery signer for wallet creation. Device signers cannot be recovery signers. */
    recovery: Exclude<SignerConfigForChain<C>, DeviceSignerConfig>;
    /** Signers to register on the wallet during creation. */
    signers?: Array<SignerConfigForChain<C> | ExternalWalletRegistrationConfig>;
    alias?: string;
};

/**
 * A device signer descriptor containing the public key and locator.
 * Returned by `createDeviceSigner`.
 */
export type DeviceSignerDescriptor = {
    type: "device";
    publicKey: { x: string; y: string };
    locator: DeviceSignerLocator;
    name?: string;
};

export type ClientSideWalletArgsFor<C extends Chain> = Omit<WalletArgsFor<C>, "owner">;

export type ClientSideWalletCreateArgs<C extends Chain> = Omit<WalletCreateArgs<C>, "owner">;

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
    approval?: Approval;
    additionalSigners?: CryptoSigner[];
};

export type ApproveParams = {
    transactionId?: string;
    signatureId?: string;
    options?: ApproveOptions;
};

export type Approval = (BaseSignResult | PasskeySignResult | DeviceSignResult) & {
    signer: string;
};

/** @deprecated Use `Signer` instead */
export type DelegatedSigner = Signer;
/** @deprecated Use `SignerInput` instead */
export type DelegatedSignerInput = SignerInput;
