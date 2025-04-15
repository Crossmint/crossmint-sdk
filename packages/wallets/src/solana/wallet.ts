import type { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";

import type {
    ApiClient,
    DelegatedSigner,
    GetNftsResponse,
    GetTransactionsResponse,
    SolanaWalletLocator,
    WalletBalance,
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
import type {
    SolanaSmartWallet,
    SmartWalletTransactionParams,
    SolanaMPCWallet,
    BaseSolanaWallet,
} from "./types/wallet";

export type Transaction = VersionedTransaction;

interface MPCTransactionParams {
    transaction: VersionedTransaction;
    additionalSigners?: SolanaNonCustodialSignerInput[];
}

export abstract class SolanaWallet implements BaseSolanaWallet {
    protected readonly transactionsService: SolanaTransactionsService;
    protected readonly delegatedSignerService: SolanaDelegatedSignerService;
    constructor(
        protected readonly apiClient: ApiClient,
        public readonly publicKey: PublicKey,
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

    public get address(): string {
        return this.publicKey.toBase58();
    }

    public async getBalances(params: {
        tokens: SolanaSupportedToken[];
    }): Promise<WalletBalance> {
        const response = await this.apiClient.getBalance(this.address, {
            tokens: params.tokens,
        });
        if ("error" in response) {
            throw new Error(`Failed to get balances: ${JSON.stringify(response.error)}`);
        }
        return response;
    }

    public async getTransactions(): Promise<GetTransactionsResponse> {
        return await this.transactionsService.getTransactions();
    }

    public async unstable_getNfts(params: {
        perPage: number;
        page: number;
        locator?: SolanaWalletLocator;
    }): Promise<GetNftsResponse> {
        return await this.apiClient.unstable_getNfts({
            walletLocator: params.locator ?? this.walletLocator,
            perPage: params.perPage,
            page: params.page,
            chain: "solana",
        });
    }

    protected get walletLocator(): SolanaWalletLocator {
        if (this.apiClient.isServerSide) {
            return this.address;
        } else {
            return `me:solana-smart-wallet`;
        }
    }
}

export class SolanaSmartWalletImpl extends SolanaWallet implements SolanaSmartWallet {
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
     * @param {SmartWalletTransactionParams} params - The transaction params
     * @returns The transaction hash
     */
    public async sendTransaction(params: SmartWalletTransactionParams): Promise<string> {
        const signer = this.getEffectiveTransactionSigner(params.delegatedSigner);
        const additionalSigners = params.additionalSigners?.map(parseSolanaNonCustodialSignerInput);
        return await this.transactionsService.createSignAndConfirm({
            transaction: params.transaction,
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
     * @throws {WalletNotAvailableError} If the wallet is not found
     * @throws {WalletTypeNotSupportedError} If the wallet type is not supported
     */
    public async getDelegatedSigners(): Promise<DelegatedSigner[]> {
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

export class SolanaMPCWalletImpl extends SolanaWallet implements SolanaMPCWallet {
    /**
     * Sign and submit a transaction
     * @param {MPCTransactionParams} params - The transaction params
     * @returns The transaction hash
     */
    public async sendTransaction(params: MPCTransactionParams): Promise<string> {
        return await this.transactionsService.createSignAndConfirm({
            transaction: params.transaction,
            additionalSigners: params.additionalSigners?.map(parseSolanaNonCustodialSignerInput),
        });
    }
}
