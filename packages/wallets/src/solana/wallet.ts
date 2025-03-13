import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import type {
    ApiClient,
    GetBalanceResponse,
    GetNftsResponse,
    GetTransactionsResponse,
    SolanaWalletLocator,
} from "../api";
import type { SolanaSupportedToken } from "./tokens";
import {
    type SolanaSigner,
    type SolanaNonCustodialSignerInput,
    type SolanaSignerInput,
    parseSolanaSignerInput,
    parseSolanaNonCustodialSignerInput,
    isNonCustodialSigner,
    type SolanaNonCustodialSigner,
} from "./types/signers";
import { SolanaTransactionsService } from "./services/transactions-service";
import { SolanaDelegatedSignerService } from "./services/delegated-signers-service";
import { getConnectionFromApiKey, getConnectionFromEnvironment } from "./utils";

interface MPCTransactionParams {
    transaction: VersionedTransaction;
    additionalSigners?: SolanaNonCustodialSignerInput[];
}

interface SmartWalletTransactionParams {
    transaction: VersionedTransaction;
    additionalSigners?: SolanaNonCustodialSignerInput[];
    delegatedSigner?: SolanaNonCustodialSignerInput;
}

abstract class SolanaWallet {
    protected readonly transactionsService: SolanaTransactionsService;
    protected readonly delegatedSignerService: SolanaDelegatedSignerService;
    constructor(
        protected readonly apiClient: ApiClient,
        protected readonly publicKey: PublicKey,
        public readonly client: { public: Connection } = {
            public: getConnectionFromEnvironment(apiClient.environment),
        }
    ) {
        this.transactionsService = new SolanaTransactionsService(
            this.walletLocator,
            this.apiClient
        );
        this.delegatedSignerService = new SolanaDelegatedSignerService(
            this.walletLocator,
            this.transactionsService,
            apiClient
        );
    }

    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    public getAddress(): string {
        return this.publicKey.toBase58();
    }

    public async balances(
        tokens: SolanaSupportedToken[]
    ): Promise<GetBalanceResponse> {
        return await this.apiClient.getBalance(this.walletLocator, {
            tokens,
        });
    }
    public async transactions(): Promise<GetTransactionsResponse> {
        return await this.transactionsService.getTransactions();
    }
    public async nfts(perPage: number, page: number): Promise<GetNftsResponse> {
        return await this.apiClient.getNfts(this.walletLocator, perPage, page);
    }

    protected get walletLocator(): SolanaWalletLocator {
        if (this.apiClient.isServerSide) {
            return this.getAddress();
        } else {
            return `me:solana-smart-wallet`;
        }
    }
}

export class SolanaSmartWallet extends SolanaWallet {
    public readonly adminSigner: SolanaSigner;
    constructor(
        apiClient: ApiClient,
        publicKey: PublicKey,
        client: { public: Connection },
        adminSignerInput: SolanaSignerInput
    ) {
        super(apiClient, publicKey, client);
        this.adminSigner = parseSolanaSignerInput(adminSignerInput);
    }

    public async sendTransaction(
        parameters: SmartWalletTransactionParams
    ): Promise<string> {
        const signer = this.getEffectiveTransactionSigner(
            parameters.delegatedSigner
        );
        const additionalSigners = parameters.additionalSigners?.map(
            parseSolanaNonCustodialSignerInput
        );
        return await this.transactionsService.createSignAndConfirm({
            transaction: parameters.transaction,
            signer: signer,
            additionalSigners,
        });
    }

    public async addDelegatedSigner(signer: string) {
        return await this.delegatedSignerService.registerDelegatedSigner(
            signer,
            isNonCustodialSigner(this.adminSigner)
                ? this.adminSigner
                : undefined
        );
    }

    private getEffectiveTransactionSigner(
        signer: SolanaNonCustodialSignerInput | undefined
    ): SolanaNonCustodialSigner | undefined {
        if (signer == null) {
            if (isNonCustodialSigner(this.adminSigner)) {
                return this.adminSigner;
            }
            return undefined;
        }
        return parseSolanaNonCustodialSignerInput(signer);
    }
}

export class SolanaMPCWallet extends SolanaWallet {
    public async sendTransaction(
        parameters: MPCTransactionParams
    ): Promise<string> {
        return await this.transactionsService.createSignAndConfirm({
            transaction: parameters.transaction,
            additionalSigners: parameters.additionalSigners?.map(
                parseSolanaNonCustodialSignerInput
            ),
        });
    }
}
