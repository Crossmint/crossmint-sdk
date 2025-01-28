import { APIErrorService, BaseCrossmintService, SDKLogger } from "@crossmint/client-sdk-base";
import type { Address, Hex } from "viem";

import type { SmartWalletChain } from "@/evm/chains";

import { SCW_SERVICE, API_VERSION } from "./utils/constants";

export const scwLogger = new SDKLogger(SCW_SERVICE);

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

interface CreateWalletResponse {
    type: "evm-smart-wallet";
    linkedUser: string;
    address: Address;
    config: {
        adminSigner: {
            type: "evm-keypair";
            address: Address;
            locator: `evm-keypair:${Address}`;
        };
    };
}

interface CreateTransactionParams {
    params: {
        signer: `evm-keypair:${Address}`;
        chain: SmartWalletChain;
        calls: {
            to: Address;
            value: string;
            data: Hex;
        }[];
    };
}

export interface TransactionResponse {
    id: string;
    walletType: "evm-smart-wallet";
    status: "awaiting-approval" | "pending" | "failed" | "success";
    approvals: {
        pending: {
            message: Hex;
            signer: `evm-keypair:${Address}`;
        }[];
        submitted: {
            message: Hex;
            signature: Hex;
            signer: `evm-keypair:${Address}`;
        }[];
    };
    onChain: {
        userOperationHash: Hex;
        txId?: Hex;
    };
}

interface ApproveTransactionParams {
    approvals: {
        signer: `evm-keypair:${Address}`;
        signature: Hex;
    }[];
}

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
}
