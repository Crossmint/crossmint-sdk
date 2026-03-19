import type { VersionedTransaction } from "@solana/web3.js";

export type ExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign?:
        | ((transaction: VersionedTransaction) => Promise<VersionedTransaction>)
        | ((payload: string) => Promise<string>);
};

export type SolanaExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

export type EvmExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign?: (payload: string) => Promise<string>;
};

export type StellarExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign?: (payload: string) => Promise<string>;
};
