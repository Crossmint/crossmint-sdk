import { SmartWalletChain } from "..";

export interface EVMToken {
    chain: SmartWalletChain;
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

export type TokenType = "nft" | "sft" | "ft";

export type ERC20TransferType = { token: ERC2OEVMToken; amount: bigint };
export type SFTTransferType = { token: SFTEVMToken; quantity: number };
export type NFTTransferType = { token: NFTEVMToken };
export type TransferType = ERC20TransferType | SFTTransferType | NFTTransferType;
