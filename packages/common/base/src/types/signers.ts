import type { VersionedTransaction } from "@solana/web3.js";
import type { Account, EIP1193Provider as ViemEIP1193Provider } from "viem";

export type BaseExternalWalletSignerConfig = {
    type: "external-wallet";
    address?: string;
};

// Generic EIP1193 Provider interface that should work with different implementations
export interface GenericEIP1193Provider {
    request(args: { method: string; params?: any[] }): Promise<any>;
    on(event: string, listener: (...args: any[]) => void): void;
    removeListener(event: string, listener: (...args: any[]) => void): void;
}

export type EvmExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    provider?: GenericEIP1193Provider | ViemEIP1193Provider;
    viemAccount?: Account;
};

export type SolanaExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    onSignTransaction?: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};

export type StellarExternalWalletSignerConfig = BaseExternalWalletSignerConfig & {
    onSignStellarTransaction?: (transaction: string) => Promise<string>;
};

export type EVM256KeypairSignerConfig = {
    type: "evm-p256-keypair";
    publicKey: string;
    chain: string;
};
