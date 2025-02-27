import { CrossmintApiClient } from "@crossmint/common-sdk-base";

import { SDK_NAME, SDK_VERSION } from "../utils/constants";

import type {
    CreateWalletDto,
    WalletV1Alpha2ResponseDto,
    CreateTransactionDto,
    SubmitApprovalDto,
    WalletsV1ControllerGetTransaction4Response,
    WalletsV1Alpha2TransactionResponseDto,
    CreateSignatureRequestDto,
    WalletsV1Alpha2SignatureResponseDto,
    WalletsV1Alpha2TransactionsResponseDto,
    Nftevm,
    Nftsol,
    WalletBalanceResponseDto,
} from "./gen/types.gen";

type CreateWalletParams = CreateWalletDto;
type CreateWalletResponse = WalletV1Alpha2ResponseDto;
type GetWalletResponse = WalletV1Alpha2ResponseDto;

type CreateTransactionParams = CreateTransactionDto;
type CreateTransactionResponse = WalletsV1Alpha2TransactionResponseDto;
type ApproveTransactionParams = SubmitApprovalDto;
type ApproveTransactionResponse = WalletsV1ControllerGetTransaction4Response;
type GetTransactionResponse = WalletsV1Alpha2TransactionResponseDto;

type CreateSignatureParams = CreateSignatureRequestDto;
type CreateSignatureResponse = WalletsV1Alpha2SignatureResponseDto;
type ApproveSignatureParams = SubmitApprovalDto;
type ApproveSignatureResponse = WalletsV1Alpha2SignatureResponseDto;
type GetSignatureResponse = WalletsV1Alpha2SignatureResponseDto;

type GetTransactionsResponse = WalletsV1Alpha2TransactionsResponseDto;
type GetNftsResponse = Nftevm | Nftsol;
type GetBalanceResponse = WalletBalanceResponseDto;

class ApiClient extends CrossmintApiClient {
    constructor(apiKey: string, jwt?: string) {
        super(
            {
                apiKey,
                jwt,
            },
            {
                internalConfig: {
                    sdkMetadata: {
                        name: SDK_NAME,
                        version: SDK_VERSION,
                    },
                },
            }
        );
    }

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await this.post("api/2022-06-09/wallets", {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getWallet(locator: string): Promise<GetWalletResponse> {
        const response = await this.get(`api/2022-06-09/wallets/${locator}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async createTransaction(
        walletLocator: string,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        const response = await this.post(`api/2022-06-09/wallets/${walletLocator}/transactions`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveTransaction(
        walletLocator: string,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse> {
        const response = await this.post(
            `api/2022-06-09/wallets/${walletLocator}/transactions/${transactionId}/approvals`,
            {
                body: JSON.stringify(params),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        return response.json();
    }

    async getTransaction(walletLocator: string, transactionId: string): Promise<GetTransactionResponse> {
        const response = await this.get(`api/2022-06-09/wallets/${walletLocator}/transactions/${transactionId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async createSignature(walletLocator: string, params: CreateSignatureParams): Promise<CreateSignatureResponse> {
        const response = await this.post(`api/2022-06-09/wallets/${walletLocator}/signatures`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveSignature(
        walletLocator: string,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse> {
        const response = await this.post(
            `api/2022-06-09/wallets/${walletLocator}/signatures/${signatureId}/approvals`,
            {
                body: JSON.stringify(params),
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
        return response.json();
    }

    async getSignature(walletLocator: string, signatureId: string): Promise<GetSignatureResponse> {
        const response = await this.get(`api/2022-06-09/wallets/${walletLocator}/signatures/${signatureId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getTransactions(walletLocator: string): Promise<GetTransactionsResponse> {
        const response = await this.get(`api/2022-06-09/wallets/${walletLocator}/transactions`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getNfts(walletLocator: string, page: number, perPage: number): Promise<GetNftsResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("perPage", perPage.toString());
        const response = await this.get(`api/2022-06-09/wallets/${walletLocator}/nfts?${queryParams.toString()}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getBalance(
        walletLocator: string,
        params: {
            chains?: string[];
            tokens: string[];
        }
    ): Promise<GetBalanceResponse> {
        const queryParams = new URLSearchParams();
        if (params.chains) {
            params.chains.forEach((chain) => queryParams.append("chains", chain));
        }
        params.tokens.forEach((token) => queryParams.append("tokens", token));
        const response = await this.get(`api/v1-alpha2/wallets/${walletLocator}/balances?${queryParams.toString()}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
}

export { ApiClient };
export type {
    CreateWalletParams,
    CreateWalletResponse,
    GetWalletResponse,
    CreateTransactionParams,
    CreateTransactionResponse,
    ApproveTransactionParams,
    ApproveTransactionResponse,
    GetTransactionResponse,
    CreateSignatureParams,
    CreateSignatureResponse,
    ApproveSignatureParams,
    ApproveSignatureResponse,
    GetSignatureResponse,
    GetTransactionsResponse,
    GetNftsResponse,
    GetBalanceResponse,
};
