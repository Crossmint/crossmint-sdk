import type { VersionedTransaction } from "@solana/web3.js";

export type ExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign:
        | ((transaction: VersionedTransaction) => Promise<VersionedTransaction>)
        | ((payload: string) => Promise<string>);
};

export type SolanaExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
    /**
     * Signs the raw approval payload, base58 in and base58 signature out. Only used for version-1
     * transactions, which `@solana/web3.js` cannot serialize for `onSign`. Supply it when the key is
     * held directly; a browser wallet adapter cannot serve it.
     */
    onSignBytes?: (payload: string) => Promise<string>;
};

export type EvmExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (payload: string) => Promise<string>;
};

export type StellarExternalWalletSignerConfig = {
    type: "external-wallet";
    address: string;
    onSign: (payload: string) => Promise<string>;
};
