import { type Crossmint, APIKeyUsageOrigin, CrossmintApiClient, validateAPIKey } from "@crossmint/common-sdk-base";
import type { Address } from "viem";

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

type WalletType = CreateWalletDto["type"];
type WalletLocator = `me:${WalletType}` | Address;

abstract class BaseApiClient extends CrossmintApiClient {
    protected apiPrefix = "api/2022-06-09/wallets";

    abstract createWallet(params: CreateWalletParams): Promise<CreateWalletResponse>;
    abstract getWallet(locator: WalletLocator): Promise<GetWalletResponse>;
    abstract createTransaction(
        walletLocator: WalletLocator,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse>;
    abstract approveTransaction(
        walletLocator: WalletLocator,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse>;
    abstract getTransaction(walletLocator: WalletLocator, transactionId: string): Promise<GetTransactionResponse>;
    abstract createSignature(
        walletLocator: WalletLocator,
        params: CreateSignatureParams
    ): Promise<CreateSignatureResponse>;
    abstract approveSignature(
        walletLocator: WalletLocator,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse>;
    abstract getSignature(walletLocator: WalletLocator, signatureId: string): Promise<GetSignatureResponse>;
    abstract getTransactions(walletLocator: string): Promise<GetTransactionsResponse>;

    async getNfts(walletLocator: WalletLocator, page: number, perPage: number): Promise<GetNftsResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("perPage", perPage.toString());
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/nfts?${queryParams.toString()}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getBalance(
        walletLocator: WalletLocator,
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

    public get isServerSide() {
        const apiKey = this.crossmint.apiKey;
        const apiKeyValidation = validateAPIKey(apiKey);
        if (!apiKeyValidation.isValid) {
            throw new Error("Invalid API key");
        }
        return apiKeyValidation.usageOrigin === APIKeyUsageOrigin.SERVER;
    }
}

class ServerSideApiClient extends BaseApiClient {
    constructor(crossmint: {
        apiKey: string;
    }) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });
    }

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await this.post(this.apiPrefix, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async getWallet(locator: WalletLocator): Promise<GetWalletResponse> {
        const response = await this.get(`${this.apiPrefix}/${locator}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async createTransaction(
        walletLocator: WalletLocator,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/transactions`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async approveTransaction(
        walletLocator: WalletLocator,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/transactions/${transactionId}/approvals`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async getTransaction(walletLocator: WalletLocator, transactionId: string): Promise<GetTransactionResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions/${transactionId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async createSignature(
        walletLocator: WalletLocator,
        params: CreateSignatureParams
    ): Promise<CreateSignatureResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signatures`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async approveSignature(
        walletLocator: WalletLocator,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signatures/${signatureId}/approvals`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async getSignature(walletLocator: WalletLocator, signatureId: string): Promise<GetSignatureResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signatures/${signatureId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
    async getTransactions(walletLocator: WalletLocator): Promise<GetTransactionsResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
}

class ClientSideApiClient extends BaseApiClient {
    constructor(crossmint: {
        apiKey: string;
        jwt: string;
    }) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });
    }

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const response = await this.post(`${this.apiPrefix}/me`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getWallet(locator: WalletLocator): Promise<GetWalletResponse> {
        const response = await this.get(`${this.apiPrefix}/${locator}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async createTransaction(
        walletLocator: WalletLocator,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/transactions`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveTransaction(
        walletLocator: WalletLocator,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/transactions/${transactionId}/approvals`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getTransaction(walletLocator: WalletLocator, transactionId: string): Promise<GetTransactionResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions/${transactionId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async createSignature(
        walletLocator: WalletLocator,
        params: CreateSignatureParams
    ): Promise<CreateSignatureResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signatures`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async approveSignature(
        walletLocator: WalletLocator,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signatures/${signatureId}/approvals`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getSignature(walletLocator: WalletLocator, signatureId: string): Promise<GetSignatureResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signatures/${signatureId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    async getTransactions(walletLocator: WalletLocator): Promise<GetTransactionsResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }
}

class ApiClient extends BaseApiClient {
    private internalClient: BaseApiClient;

    constructor(crossmint: Crossmint) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: {
                    name: SDK_NAME,
                    version: SDK_VERSION,
                },
            },
        });

        // Validate params based on the usage origin
        if (this.isServerSide) {
            this.internalClient = new ServerSideApiClient({ apiKey: crossmint.apiKey });
        } else {
            if (!crossmint.jwt) {
                throw new Error("JWT is required for client-side usage");
            }
            this.internalClient = new ClientSideApiClient({ apiKey: crossmint.apiKey, jwt: crossmint.jwt });
        }
    }

    // Implement abstract methods by delegating to internalClient
    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        return await this.internalClient.createWallet(params);
    }

    async getWallet(locator: WalletLocator): Promise<GetWalletResponse> {
        return await this.internalClient.getWallet(locator);
    }

    async createTransaction(
        walletLocator: WalletLocator,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        return await this.internalClient.createTransaction(walletLocator, params);
    }

    async approveTransaction(
        walletLocator: WalletLocator,
        transactionId: string,
        params: ApproveTransactionParams
    ): Promise<ApproveTransactionResponse> {
        return await this.internalClient.approveTransaction(walletLocator, transactionId, params);
    }

    async getTransaction(walletLocator: WalletLocator, transactionId: string): Promise<GetTransactionResponse> {
        return await this.internalClient.getTransaction(walletLocator, transactionId);
    }

    async createSignature(
        walletLocator: WalletLocator,
        params: CreateSignatureParams
    ): Promise<CreateSignatureResponse> {
        return await this.internalClient.createSignature(walletLocator, params);
    }

    async approveSignature(
        walletLocator: WalletLocator,
        signatureId: string,
        params: ApproveSignatureParams
    ): Promise<ApproveSignatureResponse> {
        return await this.internalClient.approveSignature(walletLocator, signatureId, params);
    }

    async getSignature(walletLocator: WalletLocator, signatureId: string): Promise<GetSignatureResponse> {
        return await this.internalClient.getSignature(walletLocator, signatureId);
    }

    async getTransactions(walletLocator: WalletLocator): Promise<GetTransactionsResponse> {
        return await this.internalClient.getTransactions(walletLocator);
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
    WalletLocator,
};
