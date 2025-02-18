import type {
    Connection,
    PublicKey,
    Transaction,
    VersionedTransaction,
} from "@solana/web3.js";

export interface SolanaWallet {
    // Get the wallet's public key (equivalent to EVM address)
    getPublicKey: () => PublicKey;

    // Optional nonce (similar concept but implementation differs)
    getNonce?:
        | ((
              parameters?: { seed?: string | undefined } | undefined
          ) => Promise<bigint>)
        | undefined;

    // Sign a plain message (common across chains)
    signMessage: (parameters: { message: Uint8Array }) => Promise<Uint8Array>;

    // Sign a transaction (Solana specific)
    signTransaction: (parameters: {
        transaction: Transaction | VersionedTransaction;
    }) => Promise<Transaction | VersionedTransaction>;

    // Send a signed transaction
    sendTransaction: (parameters: {
        transaction: Transaction | VersionedTransaction;
        options?: {
            skipPreflight?: boolean;
            maxRetries?: number;
        };
    }) => Promise<string>; // Returns transaction signature
}

export class SolanaSmartWallet implements SolanaWallet {
    constructor(public readonly client: { public: Connection }) {}

    public async balances() {}
    public async transactions() {}
    public async nfts() {}

    public getPublicKey(): PublicKey {
        throw new Error("Not implemented");
    }
    // biome-ignore lint/suspicious/useAwait: stub
    public async getNonce(): Promise<bigint> {
        throw new Error("Not implemented");
    }
    // biome-ignore lint/suspicious/useAwait: stub
    public async signMessage(): Promise<Uint8Array> {
        throw new Error("Not implemented");
    }
    // biome-ignore lint/suspicious/useAwait: stub
    public async signTransaction(): Promise<
        Transaction | VersionedTransaction
    > {
        throw new Error("Not implemented");
    }
    // biome-ignore lint/suspicious/useAwait: stub
    public async sendTransaction(): Promise<string> {
        throw new Error("Not implemented");
    }
}

export class SolanaMPCWallet {}
