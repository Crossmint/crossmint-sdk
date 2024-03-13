import {
    blockchainToChainId,
    blockchainToDisplayName,
    chainIdToBlockchain,
    isEVMBlockchain,
} from "@crossmint/common-sdk-base";

import {
    getBlockExplorerByBlockchain,
    getFireblocksAssetId,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
    getZeroDevProjectIdByBlockchain,
} from "./BlockchainNetworks";

// Replace with the actual path of your TypeScript file

describe("BlockchainNetworks Tests", () => {
    describe("getFireblocksAssetId", () => {
        it("should return the correct asset ID for each blockchain", () => {
            expect(getFireblocksAssetId("ethereum")).toBe("ETH");
            expect(getFireblocksAssetId("polygon")).toBe("MATIC_POLYGON");
            expect(getFireblocksAssetId("bsc")).toBe("BNB_BSC");
            expect(getFireblocksAssetId("optimism")).toBe("ETH-OPT");
            expect(getFireblocksAssetId("arbitrum")).toBe("ETH-AETH");
            expect(getFireblocksAssetId("ethereum-goerli")).toBe("ETH_TEST3");
            expect(getFireblocksAssetId("ethereum-sepolia")).toBe("ETH_TEST5");
            expect(getFireblocksAssetId("polygon-mumbai")).toBe("MATIC_POLYGON_MUMBAI");
        });
    });

    describe("getBlockchainByChainId", () => {
        it("should return the correct blockchain for each chain ID", () => {
            expect(chainIdToBlockchain(1)).toBe("ethereum");
            expect(chainIdToBlockchain(137)).toBe("polygon");
            expect(chainIdToBlockchain(56)).toBe("bsc");
            expect(chainIdToBlockchain(10)).toBe("optimism");
            expect(chainIdToBlockchain(42161)).toBe("arbitrum");
            expect(chainIdToBlockchain(5)).toBe("ethereum-goerli");
            expect(chainIdToBlockchain(11155111)).toBe("ethereum-sepolia");
            expect(chainIdToBlockchain(80001)).toBe("polygon-mumbai");
        });
    });

    describe("getChainIdByBlockchain", () => {
        it("should return the correct chain ID for each Blockchain", () => {
            expect(blockchainToChainId("ethereum")).toBe(1);
            expect(blockchainToChainId("polygon")).toBe(137);
            expect(blockchainToChainId("bsc")).toBe(56);
            expect(blockchainToChainId("optimism")).toBe(10);
            expect(blockchainToChainId("arbitrum")).toBe(42161);
            expect(blockchainToChainId("ethereum-goerli")).toBe(5);
            expect(blockchainToChainId("ethereum-sepolia")).toBe(11155111);
            expect(blockchainToChainId("polygon-mumbai")).toBe(80001);
        });
    });

    describe("getUrlProviderByBlockchain", () => {
        it("should return the correct url provider for each Blockchain", () => {
            expect(getUrlProviderByBlockchain("ethereum")).toBe("https://eth.llamarpc.com");
            expect(getUrlProviderByBlockchain("polygon")).toBe("https://polygon.llamarpc.com");
            expect(getUrlProviderByBlockchain("bsc")).toBe("https://binance.llamarpc.com");
            expect(getUrlProviderByBlockchain("optimism")).toBe("https://optimism.llamarpc.com");
            expect(getUrlProviderByBlockchain("arbitrum")).toBe("https://arbitrum.llamarpc.com");
            expect(getUrlProviderByBlockchain("ethereum-goerli")).toBe("https://ethereum-goerli.publicnode.com");
            expect(getUrlProviderByBlockchain("ethereum-sepolia")).toBe("https://ethereum-sepolia.publicnode.com");
            expect(getUrlProviderByBlockchain("polygon-mumbai")).toBe("https://rpc-mumbai.maticvigil.com");
        });
    });

    describe("getBlockExplorerByBlockchain", () => {
        it("should return the correct block explorer URL for each Blockchain", () => {
            expect(getBlockExplorerByBlockchain("ethereum")).toBe("https://etherscan.io");
            expect(getBlockExplorerByBlockchain("polygon")).toBe("https://polygonscan.com");
            expect(getBlockExplorerByBlockchain("bsc")).toBe("https://bscscan.com");
            expect(getBlockExplorerByBlockchain("optimism")).toBe("https://optimistic.etherscan.io");
            expect(getBlockExplorerByBlockchain("arbitrum")).toBe("https://arbiscan.io");
            expect(getBlockExplorerByBlockchain("ethereum-goerli")).toBe("https://goerli.etherscan.io");
            expect(getBlockExplorerByBlockchain("ethereum-sepolia")).toBe("https://sepolia.etherscan.io");
            expect(getBlockExplorerByBlockchain("polygon-mumbai")).toBe("https://mumbai.polygonscan.com");
        });
    });

    describe("getDisplayNameByBlockchain", () => {
        it("should return the correct display name for each Blockchain", () => {
            expect(blockchainToDisplayName("ethereum")).toBe("Ethereum");
            expect(blockchainToDisplayName("polygon")).toBe("Polygon");
            expect(blockchainToDisplayName("bsc")).toBe("BNB Smart Chain");
            expect(blockchainToDisplayName("optimism")).toBe("Arbitrum");
            expect(blockchainToDisplayName("arbitrum")).toBe("Arbitrum");
            expect(blockchainToDisplayName("ethereum-goerli")).toBe("Ethereum Goerli");
            expect(blockchainToDisplayName("ethereum-sepolia")).toBe("Ethereum Sepolia");
            expect(blockchainToDisplayName("polygon-mumbai")).toBe("Polygon Mumbai");
        });
    });

    describe("getTickerByBlockchain", () => {
        it("should return the correct ticker for each Blockchain", () => {
            expect(getTickerByBlockchain("ethereum")).toBe("ETH");
            expect(getTickerByBlockchain("polygon")).toBe("MATIC");
            expect(getTickerByBlockchain("bsc")).toBe("BNB");
            expect(getTickerByBlockchain("optimism")).toBe("OP");
            expect(getTickerByBlockchain("arbitrum")).toBe("ARB");
            expect(getTickerByBlockchain("ethereum-goerli")).toBe("ETH");
            expect(getTickerByBlockchain("ethereum-sepolia")).toBe("ETH");
            expect(getTickerByBlockchain("polygon-mumbai")).toBe("MATIC");
        });
    });

    describe("getTickerNameByBlockchain", () => {
        it("should return the correct ticker name for each Blockchain", () => {
            expect(getTickerNameByBlockchain("ethereum")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("polygon")).toBe("MATIC");
            expect(getTickerNameByBlockchain("bsc")).toBe("BNB_BSC");
            expect(getTickerNameByBlockchain("optimism")).toBe("OPTIMISM");
            expect(getTickerNameByBlockchain("arbitrum")).toBe("ARBITRUM");
            expect(getTickerNameByBlockchain("ethereum-goerli")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("ethereum-sepolia")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("polygon-mumbai")).toBe("MATIC");
        });
    });

    describe("getZeroDevProjectIdByBlockchain", () => {
        it("should return the correct ZeroDev project ID for each Blockchain", () => {
            expect(getZeroDevProjectIdByBlockchain("ethereum")).toBe("9ee29857-8077-404b-9a9a-31eeea996a4a");
            expect(getZeroDevProjectIdByBlockchain("polygon")).toBe("023d4a21-d801-4450-b629-24439ab1369d");
            expect(getZeroDevProjectIdByBlockchain("bsc")).toBe("3d166617-da86-494b-9348-e8a13343bc04");
            expect(getZeroDevProjectIdByBlockchain("optimism")).toBe("e9314f9e-a13d-414f-b965-c591a0248243");
            expect(getZeroDevProjectIdByBlockchain("arbitrum")).toBe("1641cd99-c1ef-404a-9d26-a9dc67b1ba51");
            expect(getZeroDevProjectIdByBlockchain("ethereum-goerli")).toBe("3cfecfb6-9d7d-4ef6-acaa-ac8f79f6cd5a");
            expect(getZeroDevProjectIdByBlockchain("ethereum-sepolia")).toBe("7ff22858-06f0-4f3a-8b46-5b41d8c75d0e");
            expect(getZeroDevProjectIdByBlockchain("polygon-mumbai")).toBe("9a334a4d-64d4-465c-ad81-856c6129e064");
        });
    });
    describe("isEVMBlockchain", () => {
        it("should return true for EVM blockchains", () => {
            expect(isEVMBlockchain("ethereum")).toBe(true);
            expect(isEVMBlockchain("polygon")).toBe(true);
            expect(isEVMBlockchain("bsc")).toBe(true);
        });
    });
});
