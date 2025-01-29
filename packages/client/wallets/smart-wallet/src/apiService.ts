import type { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";
import { APIErrorService, BaseCrossmintService, SDKLogger } from "@crossmint/client-sdk-base";
import type { Address, Hex, TypedData, TypedDataDomain } from "viem";

import type { SmartWalletChain } from "@/evm/chains";

import { SCW_SERVICE, API_VERSION } from "./utils/constants";

export const scwLogger = new SDKLogger(SCW_SERVICE);

export type Signer = `evm-keypair:${Address}` | `evm-passkey:${string}`;

interface CreateWalletParams {
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
        creationSeed: "0";
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

interface CreateTransactionParams {
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

interface ApproveTransactionParams {
    approvals: Approval[];
}

type CreateSignatureParams =
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
              isSmartWalletSignature: boolean;
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

interface ApproveSignatureParams {
    approvals: Approval[];
}

interface SignatureResponseMessage extends SignatureResponseBase {
    type: "evm-message";
    params: {
        message: string;
        signer: Signer;
        chain: SmartWalletChain;
    };
}

interface SignatureResponseTypedData extends SignatureResponseBase {
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

type NftResponse = {
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
    }
    locator: string;
    tokenStandard: string;
}[];

type WalletsAPIErrorCodes = never;

// Light wrapper over SDK APIs
// Only a subset of params related to EVM smart wallets are supported
// TODO: use JWT and /me endpoints
export class CrossmintApiService extends BaseCrossmintService {
    logger = scwLogger;
    protected apiErrorService = new APIErrorService<WalletsAPIErrorCodes>({});

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets`,
            { method: "POST", body: JSON.stringify(params) },
            "Error creating a wallet. Please contact support"
        );
        return response;
    }

    async createTransaction(walletAddress: Address, params: CreateTransactionParams): Promise<TransactionResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/transactions`,
            { method: "POST", body: JSON.stringify(params) },
            "Error creating a transaction. Please contact support"
        );
        return response;
    }

    async approveTransaction(
        walletAddress: Address,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<TransactionResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/transactions/${transactionId}/approvals`,
            { method: "POST", body: JSON.stringify(params) },
            "Error approving a transaction. Please contact support"
        );
        return response;
    }

    async getTransaction(walletAddress: Address, transactionId: string): Promise<TransactionResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/transactions/${transactionId}`,
            { method: "GET" },
            "Error getting a transaction. Please contact support"
        );
        return response;
    }

    async createSignature(walletAddress: Address, params: CreateSignatureParams): Promise<SignatureResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/signatures`,
            { method: "POST", body: JSON.stringify(params) },
            "Error creating a signature. Please contact support"
        );
        return response;
    }

    async approveSignature(
        walletAddress: Address,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<SignatureResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/signatures/${signatureId}/approvals`,
            { method: "POST", body: JSON.stringify(params) },
            "Error approving a signature. Please contact support"
        );
        return response;
    }

    async getSignature(walletAddress: Address, signatureId: string): Promise<SignatureResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/signatures/${signatureId}`,
            { method: "GET" },
            "Error getting a signature. Please contact support"
        );
        return response;
    }

    async getNfts(walletAddress: Address): Promise<NftResponse> {
        const response = await this.fetchCrossmintAPI(
            `${API_VERSION}/wallets/${walletAddress}/nfts`,
            { method: "GET" },
            "Error getting NFTs. Please contact support"
        );
        return response;
    }
}
