import { SmartWalletChain } from "@crossmint/client-sdk-smart-wallet";

type GetContractAddressFunction = (chain: SmartWalletChain) => `0x${string}`;

export const getNFTContractAddress: GetContractAddressFunction = (chain: SmartWalletChain) => {
    switch (chain) {
        case SmartWalletChain.POLYGON:
            return "0x6A1e16403c7de87071703eB21C5FB745ecA0Bf41";
        case SmartWalletChain.POLYGON_AMOY:
            return "0xf07D348194eaCAE910051615cea2E90Ec4eCA439";
        case SmartWalletChain.BASE:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        case SmartWalletChain.BASE_SEPOLIA:
            return "0x53413402DDc75895e98abEbe6940D7333F9b03D8";
        default:
            throw new Error(`[getNFTontractAddress] Invalid chain ${chain}`);
    }
};

export const getERC20ContractAddress: GetContractAddressFunction = (chain) => {
    switch (chain) {
        case SmartWalletChain.POLYGON:
            return "0xBE3E3CEdc9D9a1359415f9b3738F155f7b09c27c";
        case SmartWalletChain.POLYGON_AMOY:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        case SmartWalletChain.BASE:
            return "0xc93800Eaad38e2C809DdA65AF7e29f473bBf885a";
        case SmartWalletChain.BASE_SEPOLIA:
            return "0xC0a167dc84060e34CC716a013d1f6260a51331f2";
        default:
            throw new Error(`[getERC20ContractAddress] Invalid chain ${chain}`);
    }
};
