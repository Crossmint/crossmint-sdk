import { type Crossmint, APIKeyUsageOrigin, CrossmintApiClient } from "@crossmint/common-sdk-base";

import { SDK_NAME, SDK_VERSION } from "../utils/constants";
import { InvalidApiKeyError } from "../utils/errors";

import type {
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
    RegisterSignerParams,
    RegisterSignerResponse,
    GetSignerResponse,
    WalletLocator,
    EvmWalletLocator,
} from "./types";

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

    async getNfts(
        chain: string,
        walletLocator: WalletLocator,
        perPage: number,
        page: number
    ): Promise<GetNftsResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("page", page.toString());
        queryParams.append("perPage", perPage.toString());
        const identifier = `${chain}:${walletLocator}`;
        const response = await this.get(`${this.apiPrefix}/${identifier}/nfts?${queryParams.toString()}`, {
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
        queryParams.append("tokens", params.tokens.join(","));
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

    async getSigner(walletLocator: WalletLocator, signer: string): Promise<GetSignerResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signers/${signer}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.json();
    }

    public get isServerSide() {
        return this.parsedAPIKey.usageOrigin === APIKeyUsageOrigin.SERVER;
    }

    public get environment() {
        if (!this.parsedAPIKey.isValid) {
            throw new InvalidApiKeyError("Invalid API key");
        }
        return this.parsedAPIKey.environment;
    }
}

export { ApiClient };
