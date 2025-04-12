import type {
    GetNftsResponse,
    GetSignerResponse,
    WalletBalance,
    GetTransactionsResponse,
    SolanaWalletLocator,
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
     * @param tokens - The tokens
     * @returns The balances
     */
    getBalances(tokens: SolanaSupportedToken[]): Promise<WalletBalance>;

    /**
     * Get the wallet transactions
     * @returns The transactions
     */
    getTransactions(): Promise<GetTransactionsResponse>;

    /**
     * Get the wallet NFTs
     * @param perPage - The number of NFTs per page
     * @param page - The page number
     * @param locator - The wallet locator
     * @returns The NFTs
     */
    unstable_getNfts(perPage: number, page: number, locator?: SolanaWalletLocator): Promise<GetNftsResponse>;
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
