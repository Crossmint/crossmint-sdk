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
    CreateSignerInputDto,
    DelegatedSignerDto,
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

type RegisterSignerParams = CreateSignerInputDto;
type RegisterSignerResponse = DelegatedSignerDto;
type GetSignerResponse = DelegatedSignerDto;
type WalletType = CreateWalletDto["type"];
type EvmWalletLocator = `me:${WalletType}` | Address;
type SolanaAddress = string;
type SolanaWalletLocator = `me:${WalletType}` | SolanaAddress;
type WalletLocator = EvmWalletLocator | SolanaWalletLocator;

class ApiClient extends CrossmintApiClient {
    private apiPrefix = "api/2022-06-09/wallets";

    constructor(crossmint: Crossmint) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: { name: SDK_NAME, version: SDK_VERSION },
            },
        });
    }

    async createWallet(
        params: CreateWalletParams,
        { idempotencyKey }: { idempotencyKey?: string } = {}
    ): Promise<CreateWalletResponse> {
        const path = this.isServerSide ? `${this.apiPrefix}` : `${this.apiPrefix}/me`;
        const response = await this.post(path, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
                ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
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

    async getSignature(walletLocator: EvmWalletLocator, signatureId: string): Promise<GetSignatureResponse> {
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

    async registerSigner(
        walletLocator: WalletLocator,
        params: RegisterSignerParams,
        { idempotencyKey }: { idempotencyKey?: string } = {}
    ): Promise<RegisterSignerResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signers`, {
            body: JSON.stringify(params),
            headers: {
                "Content-Type": "application/json",
                ...(idempotencyKey ? { "x-idempotency-key": idempotencyKey } : {}),
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

    async getSigner(walletLocator: WalletLocator, signer: string): Promise<GetSignerResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signers/${signer}`, {
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
    EvmWalletLocator,
    SolanaWalletLocator,
};
