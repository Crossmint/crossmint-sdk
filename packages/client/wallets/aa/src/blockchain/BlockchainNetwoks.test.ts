import { Blockchain } from "@crossmint/common-sdk-base";

import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, WEB3_AUTH_MAINNET, WEB3_AUTH_TESTNET } from "../utils/constants";
import {
    getApiUrlByBlockchainType,
    getBlockExplorerByBlockchain,
    getBlockchainByChainId,
    getChainIdByBlockchain,
    getDisplayNameByBlockchain,
    getFireblocksAssetId,
    getTickerByBlockchain,
    getTickerNameByBlockchain,
    getUrlProviderByBlockchain,
    getWeb3AuthBlockchain,
    getZeroDevProjectIdByBlockchain,
    isEVMBlockchain,
    isTestnet,
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
            expect(getFireblocksAssetId("goerli")).toBe("ETH_TEST3");
            expect(getFireblocksAssetId("ethereum-sepolia")).toBe("ETH_TEST5");
            expect(getFireblocksAssetId("mumbai")).toBe("MATIC_POLYGON_MUMBAI");
        });
    });

    describe("getBlockchainByChainId", () => {
        it("should return the correct blockchain for each chain ID", () => {
            expect(getBlockchainByChainId(1)).toBe("ethereum");
            expect(getBlockchainByChainId(137)).toBe("polygon");
            expect(getBlockchainByChainId(56)).toBe("bsc");
            expect(getBlockchainByChainId(10)).toBe("optimism");
            expect(getBlockchainByChainId(42161)).toBe("arbitrum");
            expect(getBlockchainByChainId(5)).toBe("goerli");
            expect(getBlockchainByChainId(11155111)).toBe("ethereum-sepolia");
            expect(getBlockchainByChainId(80001)).toBe("mumbai");
        });
    });

    describe("getChainIdByBlockchain", () => {
        it("should return the correct chain ID for each Blockchain", () => {
            expect(getChainIdByBlockchain("ethereum")).toBe(1);
            expect(getChainIdByBlockchain("polygon")).toBe(137);
            expect(getChainIdByBlockchain("bsc")).toBe(56);
            expect(getChainIdByBlockchain("optimism")).toBe(10);
            expect(getChainIdByBlockchain("arbitrum")).toBe(42161);
            expect(getChainIdByBlockchain("goerli")).toBe(5);
            expect(getChainIdByBlockchain("ethereum-sepolia")).toBe(11155111);
            expect(getChainIdByBlockchain("mumbai")).toBe(80001);
        });
    });

    describe("getUrlProviderByBlockchain", () => {
        it("should return the correct url provider for each Blockchain", () => {
            expect(getUrlProviderByBlockchain("ethereum")).toBe("https://eth.llamarpc.com");
            expect(getUrlProviderByBlockchain("polygon")).toBe("https://polygon.llamarpc.com");
            expect(getUrlProviderByBlockchain("bsc")).toBe("https://binance.llamarpc.com");
            expect(getUrlProviderByBlockchain("optimism")).toBe("https://optimism.llamarpc.com");
            expect(getUrlProviderByBlockchain("arbitrum")).toBe("https://arbitrum.llamarpc.com");
            expect(getUrlProviderByBlockchain("goerli")).toBe("https://ethereum-goerli.publicnode.com");
            expect(getUrlProviderByBlockchain("ethereum-sepolia")).toBe("https://ethereum-sepolia.publicnode.com");
            expect(getUrlProviderByBlockchain("mumbai")).toBe("https://rpc-mumbai.maticvigil.com");
        });
    });

    describe("getBlockExplorerByBlockchain", () => {
        it("should return the correct block explorer URL for each Blockchain", () => {
            expect(getBlockExplorerByBlockchain("ethereum")).toBe("https://etherscan.io");
            expect(getBlockExplorerByBlockchain("polygon")).toBe("https://polygonscan.com");
            expect(getBlockExplorerByBlockchain("bsc")).toBe("https://bscscan.com");
            expect(getBlockExplorerByBlockchain("optimism")).toBe("https://optimistic.etherscan.io");
            expect(getBlockExplorerByBlockchain("arbitrum")).toBe("https://arbiscan.io");
            expect(getBlockExplorerByBlockchain("goerli")).toBe("https://goerli.etherscan.io");
            expect(getBlockExplorerByBlockchain("ethereum-sepolia")).toBe("https://sepolia.etherscan.io");
            expect(getBlockExplorerByBlockchain("mumbai")).toBe("https://mumbai.polygonscan.com");
        });
    });

    describe("getDisplayNameByBlockchain", () => {
        it("should return the correct display name for each Blockchain", () => {
            expect(getDisplayNameByBlockchain("ethereum")).toBe("Ethereum Mainnet");
            expect(getDisplayNameByBlockchain("polygon")).toBe("Polygon Mainnet");
            expect(getDisplayNameByBlockchain("bsc")).toBe("BNB Smart Chain");
            expect(getDisplayNameByBlockchain("optimism")).toBe("Optimism");
            expect(getDisplayNameByBlockchain("arbitrum")).toBe("Arbitrum");
            expect(getDisplayNameByBlockchain("goerli")).toBe("Goerli Tesnet");
            expect(getDisplayNameByBlockchain("ethereum-sepolia")).toBe("Sepolia Tesnet");
            expect(getDisplayNameByBlockchain("mumbai")).toBe("Mumbai Tesnet");
        });
    });

    describe("getTickerByBlockchain", () => {
        it("should return the correct ticker for each Blockchain", () => {
            expect(getTickerByBlockchain("ethereum")).toBe("ETH");
            expect(getTickerByBlockchain("polygon")).toBe("MATIC");
            expect(getTickerByBlockchain("bsc")).toBe("BNB");
            expect(getTickerByBlockchain("optimism")).toBe("OP");
            expect(getTickerByBlockchain("arbitrum")).toBe("ARB");
            expect(getTickerByBlockchain("goerli")).toBe("ETH");
            expect(getTickerByBlockchain("ethereum-sepolia")).toBe("ETH");
            expect(getTickerByBlockchain("mumbai")).toBe("MATIC");
        });
    });

    describe("getTickerNameByBlockchain", () => {
        it("should return the correct ticker name for each Blockchain", () => {
            expect(getTickerNameByBlockchain("ethereum")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("polygon")).toBe("MATIC");
            expect(getTickerNameByBlockchain("bsc")).toBe("BNB_BSC");
            expect(getTickerNameByBlockchain("optimism")).toBe("OPTIMISM");
            expect(getTickerNameByBlockchain("arbitrum")).toBe("ARBITRUM");
            expect(getTickerNameByBlockchain("goerli")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("ethereum-sepolia")).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain("mumbai")).toBe("MATIC");
        });
    });

    describe("getZeroDevProjectIdByBlockchain", () => {
        it("should return the correct ZeroDev project ID for each Blockchain", () => {
            expect(getZeroDevProjectIdByBlockchain("ethereum")).toBe("9ee29857-8077-404b-9a9a-31eeea996a4a");
            expect(getZeroDevProjectIdByBlockchain("polygon")).toBe("023d4a21-d801-4450-b629-24439ab1369d");
            expect(getZeroDevProjectIdByBlockchain("bsc")).toBe("3d166617-da86-494b-9348-e8a13343bc04");
            expect(getZeroDevProjectIdByBlockchain("optimism")).toBe("e9314f9e-a13d-414f-b965-c591a0248243");
            expect(getZeroDevProjectIdByBlockchain("arbitrum")).toBe("1641cd99-c1ef-404a-9d26-a9dc67b1ba51");
            expect(getZeroDevProjectIdByBlockchain("goerli")).toBe("3cfecfb6-9d7d-4ef6-acaa-ac8f79f6cd5a");
            expect(getZeroDevProjectIdByBlockchain("ethereum-sepolia")).toBe("7ff22858-06f0-4f3a-8b46-5b41d8c75d0e");
            expect(getZeroDevProjectIdByBlockchain("mumbai")).toBe("9a334a4d-64d4-465c-ad81-856c6129e064");
        });
    });

    describe("getApiUrlByBlockchainType", () => {
        it("should return CROSSMINT_STG_URL for testnet blockchains", () => {
            expect(getApiUrlByBlockchainType("goerli")).toBe(CROSSMINT_STG_URL);
            expect(getApiUrlByBlockchainType("ethereum-sepolia")).toBe(CROSSMINT_STG_URL);
            expect(getApiUrlByBlockchainType("mumbai")).toBe(CROSSMINT_STG_URL);
        });

        it("should return CROSSMINT_PROD_URL for mainnet blockchains", () => {
            expect(getApiUrlByBlockchainType("ethereum")).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType("polygon")).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType("bsc")).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType("optimism")).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType("arbitrum")).toBe(CROSSMINT_PROD_URL);
        });
    });

    describe("getWeb3AuthBlockchain", () => {
        it("should return WEB3_AUTH_TESTNET for testnet blockchains", () => {
            expect(getWeb3AuthBlockchain("goerli")).toBe(WEB3_AUTH_TESTNET);
            expect(getWeb3AuthBlockchain("ethereum-sepolia")).toBe(WEB3_AUTH_TESTNET);
            expect(getWeb3AuthBlockchain("mumbai")).toBe(WEB3_AUTH_TESTNET);
        });

        it("should return WEB3_AUTH_MAINNET for mainnet blockchains", () => {
            expect(getWeb3AuthBlockchain("ethereum")).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain("polygon")).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain("bsc")).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain("optimism")).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain("arbitrum")).toBe(WEB3_AUTH_MAINNET);
        });
    });

    describe("isTestnet", () => {
        it("should return true for testnet blockchains", () => {
            expect(isTestnet("goerli")).toBe(true);
            expect(isTestnet("ethereum-sepolia")).toBe(true);
            expect(isTestnet("mumbai")).toBe(true);
        });

        it("should return false for mainnet blockchains", () => {
            expect(isTestnet("ethereum")).toBe(false);
            expect(isTestnet("polygon")).toBe(false);
            expect(isTestnet("bsc")).toBe(false);
            expect(isTestnet("optimism")).toBe(false);
            expect(isTestnet("arbitrum")).toBe(false);
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
