import type { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";
import type { Address, Hex, TypedData, TypedDataDomain } from "viem";

import type { SmartWalletChain } from "@/evm/chains";

export type Signer = `evm-keypair:${Address}` | `evm-passkey:${string}`;

export interface CreateWalletParams {
    type: "evm-smart-wallet";
    config: {
        adminSigner:
            | {
                  type: "evm-keypair";
                  address: Address;
              }
            | {
                  type: "evm-passkey";
                  id: string;
                  name: string;
                  publicKey: {
                      x: Hex;
                      y: Hex;
                  };
              };
    };
}

export interface CreateWalletResponse {
    type: "evm-smart-wallet";
    linkedUser: string;
    address: Address;
    config: {
        adminSigner:
            | {
                  type: "evm-keypair";
                  locator: `evm-keypair:${Address}`;
                  address: Address;
              }
            | {
                  type: "evm-passkey";
                  locator: `evm-passkey:${string}`;
                  id: string;
                  name: string;
                  publicKey: {
                      x: Hex;
                      y: Hex;
                  };
                  validatorContractVersion: string;
              };
    };
}

interface TransactionCall {
    to: Address;
    value: string;
    data: Hex;
}

export interface CreateTransactionParams {
    params: {
        signer: Signer;
        chain: SmartWalletChain;
        calls: TransactionCall[];
    };
}

export interface TransactionResponse {
    id: string;
    walletType: "evm-smart-wallet";
    status: "awaiting-approval" | "pending" | "failed" | "success";
    approvals: {
        pending: {
            message: Hex;
            signer: Signer;
        }[];
        submitted: {
            message: Hex;
            signature: Hex;
            signer: Signer;
        }[];
    };
    onChain: {
        userOperationHash: Hex;
        txId?: Hex;
    };
    error?: {
        message: string;
        reason: "execution_reverted";
        revert: {
            type: "contract_call" | "wallet_authorization" | "wallet_deployment";
            reason: string;
            reasonData?: string;
            explorerLink?: string;
            simulationLink?: string;
        };
    };
}

type Approval =
    | {
          signer: `evm-keypair:${Address}`;
          signature: Hex;
      }
    | {
          signer: `evm-passkey:${string}`;
          signature: {
              r: Hex;
              s: Hex;
          };
          metadata: {
              authenticatorData: Hex;
              challengeIndex: number;
              clientDataJSON: string;
              typeIndex: number;
              userVerificationRequired: boolean;
          };
      };

export interface ApproveTransactionParams {
    approvals: Approval[];
}

export type CreateSignatureParams =
    | {
          type: "evm-message";
          params: {
              message: string;
              signer: Signer;
              chain: SmartWalletChain;
          };
      }
    | {
          type: "evm-typed-data";
          params: {
              chain: SmartWalletChain;
              signer: Signer;
              isSmartWalletSignature?: boolean;
              typedData: {
                  domain: TypedDataDomain;
                  message: Record<string, unknown>;
                  primaryType: string;
                  types: TypedData;
              };
          };
      };

interface SignatureResponseBase {
    id: string;
    walletType: "evm-smart-wallet";
    status: "awaiting-approval" | "pending" | "failed" | "success";
    approvals: {
        pending: {
            signer: Signer;
            message: Hex;
        }[];
        submitted: {
            signer: Signer;
            signature: Hex;
            message: Hex;
        }[];
    };
    createdAt: string;
}

export interface ApproveSignatureParams {
    approvals: Approval[];
}

export interface SignatureResponseMessage extends SignatureResponseBase {
    type: "evm-message";
    params: {
        message: string;
        signer: Signer;
        chain: SmartWalletChain;
    };
}

export interface SignatureResponseTypedData extends SignatureResponseBase {
    type: "evm-typed-data";
    params: {
        chain: SmartWalletChain;
        signer: Signer;
        isSmartWalletSignature: boolean;
        typedData: {
            domain: TypedDataDomain;
            message: Record<string, unknown>;
            primaryType: string;
            types: Record<string, unknown>;
        };
    };
}

export type SignatureResponse = SignatureResponseMessage | SignatureResponseTypedData;

export type NftResponse = {
    chain: Blockchain;
    contractAddress: Address;
    tokenId: string;
    metadata: {
        attributes: {
            display_type: string | null;
            trait_type: string;
            value: string;
        }[];
        collection: unknown;
        description: string;
        image: string;
        animation_url: string | null;
        name: string;
    };
    subscription?: {
        expiresAt: string;
    };
    locator: string;
    tokenStandard: string;
}[];
