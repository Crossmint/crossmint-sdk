import { validateAPIKey, environmentToCrossmintBaseURL, APIKeyUsageOrigin } from "@crossmint/common-sdk-base";
import { type Client, createClient, createConfig } from "@hey-api/client-fetch";

import type {
    ClientOptions,
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
import {
    walletsV1ControllerCreateWallet4,
    walletsV1ControllerGetWalletByLocator4,
    walletsV1ControllerCreateTransaction4,
    walletsV1ControllerSubmitApprovals4,
    walletsV1ControllerGetTransaction4,
    walletsV1ControllerCreateSignatureRequest4,
    walletsV1ControllerSubmitSignatureApprovals4,
    walletsV1ControllerGetSignature4,
    walletsV1ControllerGetTransactionsWithoutChain4,
    fetchContentFromWallet,
    balanceControllerGetBalanceForLocator2,
} from "./gen/sdk.gen";

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

class ApiClient {
    private readonly client: Client;

    constructor(
        private readonly apiKey: string,
        private readonly jwt?: string
    ) {
        const validationResult = validateAPIKey(this.apiKey);
        if (!validationResult.isValid) {
            throw new Error("Invalid API key");
        }
        if (validationResult.usageOrigin === APIKeyUsageOrigin.CLIENT && !jwt) {
            throw new Error("JWT is required for client API key");
        }

        const baseUrl = environmentToCrossmintBaseURL(validationResult.environment);
        this.client = createClient(
            createConfig<ClientOptions>({
                baseUrl,
            })
        );
    }

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await walletsV1ControllerCreateWallet4({
            client: this.client,
            body: params,
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getWallet(locator: string): Promise<GetWalletResponse> {
        const response = await walletsV1ControllerGetWalletByLocator4({
            client: this.client,
            path: {
                walletLocator: locator,
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async createTransaction(
        walletLocator: string,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        const response = await walletsV1ControllerCreateTransaction4({
            client: this.client,
            path: {
                walletLocator,
            },
            body: params,
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async approveTransaction(
        walletLocator: string,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse> {
        const response = await walletsV1ControllerSubmitApprovals4({
            client: this.client,
            path: {
                walletLocator,
                transactionId,
            },
            body: params,
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getTransaction(walletLocator: string, transactionId: string): Promise<GetTransactionResponse> {
        const response = await walletsV1ControllerGetTransaction4({
            client: this.client,
            path: {
                walletLocator,
                transactionId,
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async createSignature(walletLocator: string, params: CreateSignatureParams): Promise<CreateSignatureResponse> {
        const response = await walletsV1ControllerCreateSignatureRequest4({
            client: this.client,
            path: {
                walletLocator,
            },
            body: params,
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async approveSignature(
        walletLocator: string,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse> {
        const response = await walletsV1ControllerSubmitSignatureApprovals4({
            client: this.client,
            path: {
                walletLocator,
                signatureId,
            },
            body: params,
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getSignature(walletLocator: string, signatureId: string): Promise<GetSignatureResponse> {
        const response = await walletsV1ControllerGetSignature4({
            client: this.client,
            path: {
                walletLocator,
                signatureId,
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getTransactions(walletLocator: string): Promise<GetTransactionsResponse> {
        const response = await walletsV1ControllerGetTransactionsWithoutChain4({
            client: this.client,
            path: {
                walletLocator,
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getNfts(walletLocator: string, page: number, perPage: number): Promise<GetNftsResponse> {
        const response = await fetchContentFromWallet({
            client: this.client,
            path: {
                identifier: walletLocator,
            },
            query: {
                page: page.toString(),
                perPage: perPage.toString(),
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
    }

    async getBalance(
        walletLocator: string,
        params: {
            chains?: string[];
            tokens: string[];
        }
    ): Promise<GetBalanceResponse> {
        const response = await balanceControllerGetBalanceForLocator2({
            client: this.client,
            path: {
                walletLocator,
            },
            query: {
                chains: params.chains?.join(","),
                tokens: params.tokens.join(","),
            },
            headers: {
                "X-API-KEY": this.apiKey,
            },
        });
        if (response.error) {
            throw response.error;
        }
        return response.data;
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
