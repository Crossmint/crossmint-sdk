import { BigNumber } from "ethers";

import { EVMBlockchainIncludingTestnet, isEVMBlockchain } from "@crossmint/common-sdk-base";

export interface EVMToken {
    chain: EVMBlockchainIncludingTestnet;
    contractAddress: string;
}

export interface NFTEVMToken extends EVMToken {
    tokenId: string;
    type: "nft";
}

export interface SFTEVMToken extends EVMToken {
    tokenId: string;
    type: "sft";
}

export interface ERC2OEVMToken extends EVMToken {
    type: "ft";
}

export interface SolanaToken {
    mintHash: string;
    chain: "solana";
    type: "nft";
}
export interface CardanoToken {
    chain: "cardano";
    assetId: string;
    type: "nft";
}

export function isEVMToken(value: unknown): value is EVMToken {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const possibleEVMToken = value as Partial<EVMToken>;
    return (
        typeof possibleEVMToken.chain === "string" &&
        typeof possibleEVMToken.contractAddress === "string" &&
        isEVMBlockchain(possibleEVMToken.chain)
    );
}

export type Token = EVMToken | SolanaToken | CardanoToken;
export type TokenType = "nft" | "sft" | "ft";

export type ERC20TransferType = { token: ERC2OEVMToken; amount: BigNumber };
export type SFTTransferType = { token: SFTEVMToken; quantity: number };
export type NFTTransferType = { token: NFTEVMToken | SolanaToken | CardanoToken };
export type TransferType = ERC20TransferType | SFTTransferType | NFTTransferType;
