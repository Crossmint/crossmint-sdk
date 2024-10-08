import { type Abi, type Account, type Address, erc20Abi, erc721Abi } from "viem";

import erc1155Abi from "../ABI/ERC1155.json";
import type { ERC20TransferType, SFTTransferType, TransferType } from "../types/token";

type TransferInputParams = {
    from: Account;
    contract: Address;
    to: Address;
    config: TransferType;
};

type TransferSimulationParams = {
    account: Account;
    address: Address;
    abi: Abi;
    functionName: string;
    args: any[];
    tokenId?: string;
};

export function transferParams({ contract, config, from, to }: TransferInputParams): TransferSimulationParams {
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
                abi: erc1155Abi as Abi,
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
