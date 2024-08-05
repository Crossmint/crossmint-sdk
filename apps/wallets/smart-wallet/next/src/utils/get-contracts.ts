import { Chain } from "@crossmint/client-sdk-smart-wallet";

type GetContractAddressFunction = (chain: Chain) => `0x${string}`;

export const getNFTContractAddress: GetContractAddressFunction = (chain: Chain) => {
    switch (chain) {
        case Chain.POLYGON_AMOY:
            return "0x5c030A01e9D2C4Bb78212D06F88B7724B494B755";
        default:
            throw new Error(`[getNFTontractAddress] Invalid chain ${chain}`);
    }
};
