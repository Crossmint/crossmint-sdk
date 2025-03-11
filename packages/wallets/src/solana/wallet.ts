import type {
    Connection,
    PublicKey,
    VersionedTransaction,
} from "@solana/web3.js";

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
} from "./types/signers";
import { SolanaTransactionsService } from "./services/transactions/transactions-service";

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
    constructor(
        public readonly client: { public: Connection },
        protected readonly apiClient: ApiClient,
        protected readonly publicKey: PublicKey
    ) {
        this.transactionsService = new SolanaTransactionsService(
            this.walletLocator,
            this.apiClient
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
    private readonly adminSigner: SolanaSigner;
    constructor(
        client: { public: Connection },
        apiClient: ApiClient,
        publicKey: PublicKey,
        adminSignerInput: SolanaSignerInput
    ) {
        super(client, apiClient, publicKey);
        this.adminSigner = parseSolanaSignerInput(adminSignerInput);
    }

    public async sendTransaction(
        parameters: SmartWalletTransactionParams
    ): Promise<string> {
        const delegatedSigner = parameters.delegatedSigner
            ? parseSolanaNonCustodialSignerInput(parameters.delegatedSigner)
            : undefined;
        const additionalSigners = parameters.additionalSigners?.map(
            parseSolanaNonCustodialSignerInput
        );
        return await this.transactionsService.createSignAndConfirm({
            transaction: parameters.transaction,
            signer: delegatedSigner,
            additionalSigners,
        });
    }

    public getAdminSigner(): SolanaSigner {
        return this.adminSigner;
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
