import type { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import type {
    ApiClient,
    GetBalanceResponse,
    GetNftsResponse,
    GetSignerResponse,
    GetTransactionsResponse,
    SolanaWalletLocator,
} from "../api";
import type { Callbacks } from "../utils/options";
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
import type { SolanaSmartWallet, SmartWalletTransactionParams, SolanaMPCWallet } from "./types/wallet";

export type Transaction = VersionedTransaction;

interface MPCTransactionParams {
    transaction: VersionedTransaction;
    additionalSigners?: SolanaNonCustodialSignerInput[];
}

export abstract class SolanaWallet {
    protected readonly transactionsService: SolanaTransactionsService;
    protected readonly delegatedSignerService: SolanaDelegatedSignerService;
    constructor(
        protected readonly apiClient: ApiClient,
        protected readonly publicKey: PublicKey,
        protected readonly client: Connection,
        protected readonly callbacks: Callbacks
    ) {
        this.transactionsService = new SolanaTransactionsService(this.walletLocator, this.apiClient);
        this.delegatedSignerService = new SolanaDelegatedSignerService(
            this.walletLocator,
            this.transactionsService,
            apiClient
        );
    }

    /**
     * Get the wallet public key
     * @returns The wallet public key
     */
    public getPublicKey(): PublicKey {
        return this.publicKey;
    }

    /**
     * Get the wallet address
     * @returns The wallet address
     */
    public getAddress(): string {
        return this.publicKey.toBase58();
    }

    /**
     * Get the wallet balances
     * @param tokens - The tokens
     * @returns The balances
     */
    public async getBalances(tokens: SolanaSupportedToken[]): Promise<GetBalanceResponse> {
        return await this.apiClient.getBalance(this.getAddress(), {
            tokens,
        });
    }

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    public async getTransactions(): Promise<GetTransactionsResponse> {
        return await this.transactionsService.getTransactions();
    }

    /**
     * Get the wallet NFTs
     * @param perPage - The number of NFTs per page
     * @param page - The page number
     * @param locator - The wallet locator
     * @returns The NFTs
     */
    public async getNfts(perPage: number, page: number, locator?: SolanaWalletLocator): Promise<GetNftsResponse> {
        return await this.apiClient.getNfts("solana", locator ?? this.walletLocator, perPage, page);
    }

    protected get walletLocator(): SolanaWalletLocator {
        if (this.apiClient.isServerSide) {
            return this.getAddress();
        } else {
            return `me:solana-smart-wallet`;
        }
    }
}

export class ISolanaSmartWallet extends SolanaWallet implements SolanaSmartWallet {
    public readonly adminSigner: SolanaSigner;
    constructor(
        apiClient: ApiClient,
        publicKey: PublicKey,
        adminSignerInput: SolanaSignerInput,
        client: Connection,
        callbacks: Callbacks
    ) {
        super(apiClient, publicKey, client, callbacks);
        this.adminSigner = parseSolanaSignerInput(adminSignerInput);
    }

    /**
     * Sign and submit a transaction
     * @param parameters - The transaction parameters
     * @returns The transaction hash
     */
    public async sendTransaction(parameters: SmartWalletTransactionParams): Promise<string> {
        const signer = this.getEffectiveTransactionSigner(parameters.delegatedSigner);
        const additionalSigners = parameters.additionalSigners?.map(parseSolanaNonCustodialSignerInput);
        return await this.transactionsService.createSignAndConfirm({
            transaction: parameters.transaction,
            signer,
            additionalSigners,
        });
    }

    /**
     * Add a delegated signer to the wallet
     * @param signer - The signer
     * @returns The delegated signer
     */
    public async addDelegatedSigner(signer: string) {
        return await this.delegatedSignerService.registerDelegatedSigner(
            signer,
            isNonCustodialSigner(this.adminSigner) ? this.adminSigner : undefined
        );
    }

    /**
     * Gets delegated signers for the wallet
     * @returns The delegated signers
     */
    public async getDelegatedSigners(): Promise<GetSignerResponse[]> {
        return await this.delegatedSignerService.getDelegatedSigners();
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

export class ISolanaMPCWallet extends SolanaWallet implements SolanaMPCWallet {
    /**
     * Sign and submit a transaction
     * @param parameters - The transaction parameters
     * @returns The transaction hash
     */
    public async sendTransaction(parameters: MPCTransactionParams): Promise<string> {
        return await this.transactionsService.createSignAndConfirm({
            transaction: parameters.transaction,
            additionalSigners: parameters.additionalSigners?.map(parseSolanaNonCustodialSignerInput),
        });
    }
}
