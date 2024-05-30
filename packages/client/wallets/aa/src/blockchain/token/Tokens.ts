import { Account, Address, erc20Abi, erc721Abi } from "viem";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

import erc1155Abi from "../../ABI/ERC1155.json";

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

export function transferParams({
    contract,
    config,
    from,
    to,
}: {
    from: Account;
    contract: Address;
    to: Address;
    config: TransferType;
}): {
    account: Account;
    address: Address;
    abi: any;
    functionName: string;
    args: any[];
    tokenId?: string;
} {
    switch (config.token.type) {
        case "ft": {
            return {
                account: from,
                address: contract,
                abi: erc20Abi,
                functionName: "transfer",
                args: [to, (config as ERC20TransferType).amount],
            };
        }
        case "sft": {
            return {
                account: from,
                address: contract,
                abi: erc1155Abi,
                functionName: "safeTransferFrom",
                args: [from.address, to, config.token.tokenId, (config as SFTTransferType).quantity, "0x00"],
                tokenId: config.token.tokenId,
            };
        }
        case "nft": {
            return {
                account: from,
                address: contract,
                abi: erc721Abi,
                functionName: "safeTransferFrom",
                args: [from.address, to, config.token.tokenId],
                tokenId: config.token.tokenId,
            };
        }
    }
}

export type TokenType = "nft" | "sft" | "ft";

export type ERC20TransferType = { token: ERC2OEVMToken; amount: bigint };
export type SFTTransferType = { token: SFTEVMToken; quantity: number };
export type NFTTransferType = { token: NFTEVMToken };
export type TransferType = ERC20TransferType | SFTTransferType | NFTTransferType;
