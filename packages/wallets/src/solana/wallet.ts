import type { Connection, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

import type { ApiClient } from "../api";

export interface SolanaWallet {
    // Get the wallet's public key (equivalent to EVM address)
    getPublicKey: () => PublicKey;

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
    constructor(
        public readonly client: { public: Connection },
        private readonly apiClient: ApiClient
    ) {}

    public async balances() {}
    public async transactions() {}
    public async nfts() {}

    public getPublicKey(): PublicKey {
        throw new Error("Not implemented");
    }
    // biome-ignore lint/suspicious/useAwait: stub
    public async sendTransaction(): Promise<string> {
        throw new Error("Not implemented");
    }
}

export class SolanaMPCWallet {}
