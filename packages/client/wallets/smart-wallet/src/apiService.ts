import type { BlockchainIncludingTestnet as Blockchain, Crossmint } from "@crossmint/common-sdk-base";
import { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { APIErrorService, SDKLogger } from "@crossmint/client-sdk-base";
import type { Address } from "viem";

import { SDK_NAME, SDK_VERSION, SCW_SERVICE, API_VERSION } from "./utils/constants";
import type { UserParams } from "./smartWalletService";
import type {
    CreateWalletParams,
    CreateWalletResponse,
    CreateTransactionParams,
    TransactionResponse,
    ApproveTransactionParams,
    CreateSignatureParams,
    SignatureResponse,
    ApproveSignatureParams,
    NftResponse,
} from "./types/api";

export const scwLogger = new SDKLogger(SCW_SERVICE);

type WalletsAPIErrorCodes = never;

// Light wrapper over SDK APIs
// Only a subset of params related to EVM smart wallets are supported
export class CrossmintApiService {
    logger = scwLogger;
    protected apiErrorService = new APIErrorService<WalletsAPIErrorCodes>({});
    protected apiClient: CrossmintApiClient;

    constructor(crossmint: Crossmint) {
        this.apiClient = new CrossmintApiClient(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });
    }

    async createWallet(user: UserParams, params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await this.apiClient.post(`api/${API_VERSION}/wallets/me`, {
            body: JSON.stringify(params),
            headers: {
                Authorization: `Bearer ${user.jwt}`,
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async createTransaction(user: UserParams, params: CreateTransactionParams): Promise<TransactionResponse> {
        const response = await this.apiClient.post(`api/${API_VERSION}/wallets/me:evm-smart-wallet/transactions`, {
            body: JSON.stringify(params),
            headers: {
                Authorization: `Bearer ${user.jwt}`,
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveTransaction(
        user: UserParams,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<TransactionResponse> {
        const response = await this.apiClient.post(
            `api/${API_VERSION}/wallets/me:evm-smart-wallet/transactions/${transactionId}/approvals`,
            {
                body: JSON.stringify(params),
                headers: {
                    Authorization: `Bearer ${user.jwt}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.json();
    }

    async getTransaction(user: UserParams, transactionId: string): Promise<TransactionResponse> {
        const response = await this.apiClient.get(
            `api/${API_VERSION}/wallets/me:evm-smart-wallet/transactions/${transactionId}`,
            {
                headers: {
                    Authorization: `Bearer ${user.jwt}`,
                },
            }
        );
        return response.json();
    }

    async createSignature(user: UserParams, params: CreateSignatureParams): Promise<SignatureResponse> {
        const response = await this.apiClient.post(`api/${API_VERSION}/wallets/me:evm-smart-wallet/signatures`, {
            body: JSON.stringify(params),
            headers: {
                Authorization: `Bearer ${user.jwt}`,
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveSignature(
        user: UserParams,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<SignatureResponse> {
        const response = await this.apiClient.post(
            `api/${API_VERSION}/wallets/me:evm-smart-wallet/signatures/${signatureId}/approvals`,
            {
                body: JSON.stringify(params),
                headers: {
                    Authorization: `Bearer ${user.jwt}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return response.json();
    }

    async getSignature(user: UserParams, signatureId: string): Promise<SignatureResponse> {
        const response = await this.apiClient.get(
            `api/${API_VERSION}/wallets/me:evm-smart-wallet/signatures/${signatureId}`,
            {
                headers: {
                    Authorization: `Bearer ${user.jwt}`,
                },
            }
        );
        return response.json();
    }

    async getNfts(walletLocator: `${Blockchain}:${Address}`): Promise<NftResponse> {
        const response = await this.apiClient.get(`api/${API_VERSION}/wallets/${walletLocator}/nfts`, {});
        return response.json();
    }
}
