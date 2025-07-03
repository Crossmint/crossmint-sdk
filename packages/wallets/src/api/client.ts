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
    SendParams,
    SendResponse,
    GetActivityResponse,
} from "./types";
import type { Chain } from "../chains/chains";

class ApiClient extends CrossmintApiClient {
    private apiPrefix = "api/2025-06-09/wallets";

    constructor(crossmint: Crossmint) {
        super(crossmint, {
            internalConfig: {
                sdkMetadata: { name: SDK_NAME, version: SDK_VERSION },
            },
        });
    }

    async createWallet(params: CreateWalletParams): Promise<CreateWalletResponse> {
        const path = this.isServerSide ? `${this.apiPrefix}` : `${this.apiPrefix}/me`;
        const response = await this.post(path, {
            body: JSON.stringify(params),
            headers: this.headers,
        });
        return response.json();
    }

    async getWallet(locator: WalletLocator): Promise<GetWalletResponse> {
        const response = await this.get(`${this.apiPrefix}/${locator}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async createTransaction(
        walletLocator: WalletLocator,
        params: CreateTransactionParams
    ): Promise<CreateTransactionResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/transactions`, {
            body: JSON.stringify(params),
            headers: this.headers,
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
            headers: this.headers,
        });
        return response.json();
    }

    async getTransaction(walletLocator: WalletLocator, transactionId: string): Promise<GetTransactionResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions/${transactionId}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async createSignature(
        walletLocator: WalletLocator,
        params: CreateSignatureParams
    ): Promise<CreateSignatureResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signatures`, {
            body: JSON.stringify(params),
            headers: this.headers,
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
            headers: this.headers,
        });
        return response.json();
    }

    async getSignature(walletLocator: EvmWalletLocator, signatureId: string): Promise<GetSignatureResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signatures/${signatureId}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async getTransactions(walletLocator: WalletLocator): Promise<GetTransactionsResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/transactions`, {
            headers: this.headers,
        });
        return response.json();
    }

    async experimental_getNfts(params: {
        address: string;
        perPage: number;
        page: number;
        chain: string;
    }): Promise<GetNftsResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("page", params.page.toString());
        queryParams.append("perPage", params.perPage.toString());
        const identifier = `${params.chain}:${params.address}`;
        const response = await this.get(`${this.apiPrefix}/${identifier}/nfts?${queryParams.toString()}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async experimental_activity(walletLocator: WalletLocator, params: { chain: Chain }): Promise<GetActivityResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("chain", params.chain.toString());
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/activity?${queryParams.toString()}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async getBalance(
        walletLocator: WalletLocator,
        params: {
            chains: Chain[];
            tokens: string[];
        }
    ): Promise<GetBalanceResponse> {
        const queryParams = new URLSearchParams();
        queryParams.append("tokenLocators", params.tokens.join(","));
        queryParams.append("chains", params.chains.join(","));
        const response = await this.get(`api/unstable/wallets/${walletLocator}/balances?${queryParams.toString()}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async registerSigner(walletLocator: WalletLocator, params: RegisterSignerParams): Promise<RegisterSignerResponse> {
        const response = await this.post(`${this.apiPrefix}/${walletLocator}/signers`, {
            body: JSON.stringify(params),
            headers: this.headers,
        });
        return response.json();
    }

    async getSigner(walletLocator: WalletLocator, signer: string): Promise<GetSignerResponse> {
        const response = await this.get(`${this.apiPrefix}/${walletLocator}/signers/${signer}`, {
            headers: this.headers,
        });
        return response.json();
    }

    async send(walletLocator: WalletLocator, tokenLocator: string, params: SendParams): Promise<SendResponse> {
        const response = await this.post(`api/unstable/wallets/${walletLocator}/tokens/${tokenLocator}/transfers`, {
            body: JSON.stringify(params),
            headers: this.headers,
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

    private get headers() {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        };
        return headers;
    }
}

export { ApiClient };
