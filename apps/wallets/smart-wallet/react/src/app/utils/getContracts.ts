import { Blockchain } from "@crossmint/client-sdk-aa-passkeys-beta";

type GetContractAddressFunction = (chain: Blockchain) => `0x${string}`;

export const getNFTContractAddress: GetContractAddressFunction = (chain) => {
    switch (chain) {
        case Blockchain.ETHEREUM_SEPOLIA:
            return "0x8B95ED7859f89523A1d7Fe3df1668e9cFfbAF859";
        case Blockchain.POLYGON:
            return "0x6A1e16403c7de87071703eB21C5FB745ecA0Bf41";
        case Blockchain.POLYGON_AMOY:
            return "0xf07D348194eaCAE910051615cea2E90Ec4eCA439";
        case Blockchain.OPTIMISM:
            return "0xc93800eaad38e2c809dda65af7e29f473bbf885a";
        case Blockchain.OPTIMISM_SEPOLIA:
            return "0x0410e60368EF427081d949BE6a57cf7257535266";
        case Blockchain.BASE:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        case Blockchain.BASE_SEPOLIA:
            return "0x53413402DDc75895e98abEbe6940D7333F9b03D8";
        case Blockchain.ARBITRUM:
            return "0xf07d348194eacae910051615cea2e90ec4eca439";
        case Blockchain.ARBITRUM_SEPOLIA:
            return "0xf07d348194eacae910051615cea2e90ec4eca439";
        case Blockchain.ASTAR_ZKEVM:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        case Blockchain.ZKYOTO:
            return "0xf07D348194eaCAE910051615cea2E90Ec4eCA439";
        default:
            throw new Error(`[getNFTontractAddress] Invalid chain ${chain}`);
    }
};

export const getERC20ContractAddress: GetContractAddressFunction = (chain) => {
    switch (chain) {
        case Blockchain.ETHEREUM_SEPOLIA:
            return "0x7Db0465E286187DA8Ff5A4B139DD88890a553764";
        case Blockchain.POLYGON:
            return "0xBE3E3CEdc9D9a1359415f9b3738F155f7b09c27c";
        case Blockchain.POLYGON_AMOY:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        case Blockchain.OPTIMISM:
            return "0x660dc1662ca32f65cab5d83c98757cc73566a7bb";
        case Blockchain.OPTIMISM_SEPOLIA:
            return "0x6F5eD9419C9E9487cc25fda52479C1534F57EC19";
        case Blockchain.BASE:
            return "0xc93800Eaad38e2C809DdA65AF7e29f473bBf885a";
        case Blockchain.BASE_SEPOLIA:
            return "0xC0a167dc84060e34CC716a013d1f6260a51331f2";
        case Blockchain.ARBITRUM:
            return "0xc81829d73e136ccfee90c17a49ea7f9c2c28d3d7";
        case Blockchain.ARBITRUM_SEPOLIA:
            return "0xc81829d73e136ccfee90c17a49ea7f9c2c28d3d7";
        case Blockchain.ASTAR_ZKEVM:
            return "0xc93800Eaad38e2C809DdA65AF7e29f473bBf885a";
        case Blockchain.ZKYOTO:
            return "0xc81829d73e136CcFee90c17a49Ea7F9c2c28d3d7";
        default:
            throw new Error(`[getERC20ContractAddress] Invalid chain ${chain}`);
    }
};
