import type { Address, Hex, SignableMessage } from "viem";
import type { GetBalanceResponse, GetNftsResponse, GetTransactionsResponse } from "@/api";
import type { EVMSmartWalletChain } from "../chains";

export interface EVMSmartWallet {
    address: Address;
    getBalances(params: { chain: EVMSmartWalletChain; tokens: Address[] }): Promise<GetBalanceResponse>;
    getTransactions(): Promise<GetTransactionsResponse>;
    unstable_getNfts(params: {
        perPage: number;
        page: number;
        chain: EVMSmartWalletChain;
        locator?: string;
    }): Promise<GetNftsResponse>;
    signMessage(params: { message: SignableMessage; chain: EVMSmartWalletChain }): Promise<Hex>;
    sendTransaction(params: TransactionInput): Promise<Hex>;
}

export interface TransactionInput {
    to: Address;
    chain: EVMSmartWalletChain;
    data?: Hex;
    value?: bigint;
}
