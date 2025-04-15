import type { Address, Hex, HttpTransport, PublicClient, SignableMessage, TypedData, TypedDataDefinition } from "viem";
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
    getViemClient(params: { chain: EVMSmartWalletChain; transport?: HttpTransport }): PublicClient<HttpTransport>;
    getNonce(params: {
        chain: EVMSmartWalletChain;
        key?: bigint | undefined;
        transport?: HttpTransport;
    }): Promise<bigint>;
    signTypedData<
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(params: TypedDataDefinition<typedData, primaryType> & { chain: EVMSmartWalletChain }): Promise<Hex>;
}

export interface TransactionInput {
    to: Address;
    chain: EVMSmartWalletChain;
    data?: Hex;
    value?: bigint;
}
