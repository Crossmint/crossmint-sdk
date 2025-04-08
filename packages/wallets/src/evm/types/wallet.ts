import type { Address, HttpTransport, PublicClient } from "viem";
import type { GetBalanceResponse, GetNftsResponse, GetTransactionsResponse } from "@/api";
import type { ViemWallet } from "../wallet";
import type { EVMSmartWalletChain } from "../chains";

export interface EVMSmartWallet extends ViemWallet {
    getBalances(tokens: Address[]): Promise<GetBalanceResponse>;
    getTransactions(): Promise<GetTransactionsResponse>;
    getNfts(perPage: number, page: number, chain: string, locator?: string): Promise<GetNftsResponse>;
    chain: EVMSmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
}
