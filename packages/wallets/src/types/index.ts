import type { EVMSmartWalletChain } from "@/evm";
import type { VersionedTransaction } from "@solana/web3.js";
import type { Address, Hex } from "viem";
import type { WalletOptions } from "@/utils/options";

// Chain types
export type SolanaChain = "solana";
export type EVMChain = "ethereum" | "polygon" | "optimism" | "arbitrum" | "base";
export type Chain = SolanaChain | EVMChain;

// Owner types
export type OwnerKey = "email" | "userId" | "x" | "phone";
export type Owner =
    | {
          [K in OwnerKey]: { [P in K]: string };
      }[OwnerKey]
    | string;

// Delegated Signer types
export type DelegatedSignerType = "email" | "userId" | "x" | "phone" | "wallet" | "api-key";
export type DelegatedSigner = {
    type: DelegatedSignerType;
    value?: string;
};

// Permission types
export type Permission = {
    signer: DelegatedSigner;
};

// Base Signer types
export type BaseSigner =
    | {
          type: "email";
          onAuthRequired?: (
              sendEmailWithOtp: (email: string) => Promise<void>,
              verifyOtp: (otp: string) => Promise<void>,
              reject: (error: Error) => void
          ) => Promise<void>;
      }
    | { type: "api-key" };

// Solana Signer types
export type SolanaSigner = {
    type: "external-wallet";
    address: string;
    onSignMessage: (message: Uint8Array) => Promise<Uint8Array>;
    onSignTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

// EVM Signer types
export type EVMSigner =
    | {
          type: "evm-passkey";
          name: string;
          id: string;
          onCreatePasskey?: string;
          onSignWithPasskey?: (message: Uint8Array) => Promise<Uint8Array>;
      }
    | {
          type: "external-wallet";
          address: string;
          onSignMessage: (message: string) => Promise<Hex>;
          onSignTransaction: (params: EVMTransactionInput) => Promise<Hex>;
      };

// Chain-specific signer type
export type SignerForChain<C extends Chain> = C extends SolanaChain
    ? SolanaSigner | BaseSigner
    : EVMSigner | BaseSigner;

// Wallet
export type GetOrCreateWalletOptions<C extends Chain> = {
    chain: C;
    owner?: Owner;
    signer?: SignerForChain<C>;
    options?: WalletOptions;
};
export type WalletType = "evm-smart-wallet" | "solana-smart-wallet";

export interface EVMTransactionInput {
    to: Address;
    chain: EVMSmartWalletChain;
    data?: Hex;
    value?: bigint;
}
