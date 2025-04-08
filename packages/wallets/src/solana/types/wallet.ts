import type { GetSignerResponse } from "@/api";
import type { SolanaNonCustodialSignerInput, SolanaSigner } from "./signers";
import type { VersionedTransaction } from "@solana/web3.js";
import type { SolanaWallet } from "../wallet";

export interface SolanaSmartWallet extends SolanaWallet {
    addDelegatedSigner(signer: string): Promise<GetSignerResponse>;
    getDelegatedSigners(): Promise<GetSignerResponse[]>;
    adminSigner: SolanaSigner;
    sendTransaction(parameters: SmartWalletTransactionParams): Promise<string>;
}

export interface SolanaMPCWallet extends SolanaWallet {
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
