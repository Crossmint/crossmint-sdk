import type { Abi, Address } from "viem";

import type { SmartWalletChain } from "../evm/chains";

interface EVMToken {
    chain: SmartWalletChain;
    contractAddress: Address;
}

interface NFTEVMToken extends EVMToken {
    tokenId: string;
    type: "nft";
}

interface SFTEVMToken extends EVMToken {
    tokenId: string;
    type: "sft";
}

interface ERC2OEVMToken extends EVMToken {
    type: "ft";
}

export interface ERC20TransferType {
    token: ERC2OEVMToken;
    amount: bigint;
}
export interface SFTTransferType {
    token: SFTEVMToken;
    quantity: number;
}
export interface NFTTransferType {
    token: NFTEVMToken;
}
export type TransferType = ERC20TransferType | SFTTransferType | NFTTransferType;

export interface TransferInputParams {
    from: Address;
    contract: Address;
    to: Address;
    config: TransferType;
}

export interface TransferSimulationParams {
    address: Address;
    abi: Abi;
    functionName: string;
    args: unknown[];
    tokenId?: string;
}
