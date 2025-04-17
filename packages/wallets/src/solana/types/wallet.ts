import type {
    GetNftsResponse,
    GetSignerResponse,
    WalletBalance,
    GetTransactionsResponse,
    DelegatedSigner,
} from "@/api";
import type { SolanaNonCustodialSignerInput, SolanaSigner } from "./signers";
import type { PublicKey, VersionedTransaction } from "@solana/web3.js";
import type { SolanaSupportedToken } from "../tokens";

export interface BaseSolanaWallet {
    /**
     * The wallet public key
     */
    publicKey: PublicKey;

    /**
     * The wallet address
     */
    address: string;

    /**
     * Get the wallet balances
     * @param {Object} params - The parameters
     * @param {SolanaSupportedToken[]} params.tokens - The tokens
     * @returns {Promise<WalletBalance>} The balances
     */
    getBalances(params: {
        tokens: SolanaSupportedToken[];
    }): Promise<WalletBalance>;

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    getTransactions(): Promise<GetTransactionsResponse>;

    /**
     * Get the wallet NFTs
     * @param {Object} params - The parameters
     * @param {number} params.perPage - The number of NFTs per page
     * @param {number} params.page - The page number
     * @param {SolanaWalletLocator} [params.locator] - The wallet locator
     * @returns {Promise<GetNftsResponse>} The NFTs
     */
    unstable_getNfts(params: { perPage: number; page: number }): Promise<GetNftsResponse>;
}

export interface SolanaSmartWallet extends BaseSolanaWallet {
    addDelegatedSigner(signer: string): Promise<GetSignerResponse>;
    getDelegatedSigners(): Promise<DelegatedSigner[]>;
    adminSigner: SolanaSigner;
    sendTransaction(parameters: SmartWalletTransactionParams): Promise<string>;
}

export interface SolanaMPCWallet extends BaseSolanaWallet {
    sendTransaction(parameters: {
        transaction: VersionedTransaction;
        additionalSigners?: SolanaNonCustodialSignerInput[];
    }): Promise<string>;
}

export interface SmartWalletTransactionParams {
    transaction: VersionedTransaction;
    additionalSigners?: SolanaNonCustodialSignerInput[];
    delegatedSigner?: SolanaNonCustodialSignerInput;
}
