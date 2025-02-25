import { type Abi, erc20Abi, erc721Abi } from "viem";

import erc1155Abi from "../abi/erc1155";
import type {
    ERC20TransferType,
    SFTTransferType,
    TransferInputParams,
    TransferSimulationParams,
} from "../types/transfer";

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
