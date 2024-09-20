import type { TransactionRequest } from "@ethersproject/abstract-provider";
import type { Transaction as SolanaLegacyTransaction } from "@solana/web3.js";

import type { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export type SignMessage = {
    signMessage?: (message: Uint8Array) => Promise<string>;
};

export type SendEthersTransaction = {
    sendTransaction?: (transaction: TransactionRequest) => Promise<string>;
};
export type SignSolanaTransaction = {
    signTransaction?: (transaction: SolanaLegacyTransaction) => Promise<string>;
};

export type SignTypedData = {
    signTypedData?: (data: any) => Promise<string>;
};

export type GetSupportedChains = {
    getSupportedChains: () => BlockchainIncludingTestnet[];
};
export type GetAddress = {
    getAddress: () => Promise<string>;
};
