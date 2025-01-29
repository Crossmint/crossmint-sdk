import { type Abi, type Address, erc20Abi, erc721Abi } from "viem";

import erc1155Abi from "@/abi/erc1155";

import type { SmartWalletChain } from "./chains";

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

interface ERC20TransferType {
    token: ERC2OEVMToken;
    amount: bigint;
}
interface SFTTransferType {
    token: SFTEVMToken;
    quantity: number;
}
interface NFTTransferType {
    token: NFTEVMToken;
}
export type TransferType = ERC20TransferType | SFTTransferType | NFTTransferType;

interface TransferInputParams {
    from: Address;
    contract: Address;
    to: Address;
    config: TransferType;
}

interface TransferSimulationParams {
    address: Address;
    abi: Abi;
    functionName: string;
    args: unknown[];
    tokenId?: string;
}

export function transferParams({ contract, config, from, to }: TransferInputParams): TransferSimulationParams {
    switch (config.token.type) {
        case "ft": {
            return {
                address: contract,
                abi: erc20Abi,
                functionName: "transfer",
                args: [to, (config as ERC20TransferType).amount],
            };
        }
        case "sft": {
            return {
                address: contract,
                abi: erc1155Abi as Abi,
                functionName: "safeTransferFrom",
                args: [from, to, config.token.tokenId, (config as SFTTransferType).quantity, "0x00"],
                tokenId: config.token.tokenId,
            };
        }
        case "nft": {
            return {
                address: contract,
                abi: erc721Abi,
                functionName: "safeTransferFrom",
                args: [from, to, config.token.tokenId],
                tokenId: config.token.tokenId,
            };
        }
    }
}
