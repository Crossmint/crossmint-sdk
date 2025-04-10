import type { Address, Hex, SignableMessage, PublicClient, HttpTransport, TypedData, TypedDataDefinition } from "viem";
import type { GetBalanceResponse, GetNftsResponse, GetTransactionsResponse } from "@/api";
import type { EVMSmartWalletChain } from "../chains";

export interface EVMSmartWallet extends ViemWallet {
    getBalances(tokens: Address[]): Promise<GetBalanceResponse>;
    getTransactions(): Promise<GetTransactionsResponse>;
    unstable_getNfts(perPage: number, page: number, chain: string, locator?: string): Promise<GetNftsResponse>;
    chain: EVMSmartWalletChain;
    publicClient: PublicClient<HttpTransport>;
}

export interface TransactionInput {
    to: Address;
    data?: Hex;
    value?: bigint;
}

export interface ViemWallet {
    /**
     * The wallet address
     */
    address: Address;

    /**
     * Get the wallet nonce
     * @param parameters - The parameters
     * @returns The nonce
     */
    getNonce?: ((parameters?: { key?: bigint | undefined } | undefined) => Promise<bigint>) | undefined;

    /**
     * Sign a message
     * @param parameters - The parameters
     * @returns The signature
     */
    signMessage: (parameters: { message: SignableMessage }) => Promise<Hex>;

    /**
     * Sign a typed data
     * @param parameters - The parameters
     * @returns The signature
     */
    signTypedData: <
        const typedData extends TypedData | Record<string, unknown>,
        primaryType extends keyof typedData | "EIP712Domain" = keyof typedData,
    >(
        parameters: TypedDataDefinition<typedData, primaryType>
    ) => Promise<Hex>;

    /**
     * Sign and submit a transaction
     * @param parameters - The transaction parameters
     * @returns The transaction hash
     */
    sendTransaction: (parameters: TransactionInput) => Promise<Hex>;
}
