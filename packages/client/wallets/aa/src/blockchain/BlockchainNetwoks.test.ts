import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, WEB3_AUTH_MAINNET, WEB3_AUTH_TESTNET } from "../utils/constants";
import {
    Blockchain,
    getApiUrlByBlockchainType,
    getAssetIdByBlockchain,
    getBlockExplorerByBlockchain,
    getBlockchainByChainId,
    getChainIdByBlockchain,
    getDisplayNameByBlockchain,
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
    describe("getAssetIdByBlockchain", () => {
        it("should return the correct asset ID for each blockchain", () => {
            expect(getAssetIdByBlockchain(Blockchain.ETHEREUM)).toBe("ETH");
            expect(getAssetIdByBlockchain(Blockchain.POLYGON)).toBe("MATIC_POLYGON");
            expect(getAssetIdByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getAssetIdByBlockchain(Blockchain.OPTIMISM)).toBe("ETH-OPT");
            expect(getAssetIdByBlockchain(Blockchain.ARBITRUM)).toBe("ETH-AETH");
            expect(getAssetIdByBlockchain(Blockchain.GOERLI)).toBe("ETH_TEST3");
            expect(getAssetIdByBlockchain(Blockchain.SEPOLIA)).toBe("ETH_TEST5");
            expect(getAssetIdByBlockchain(Blockchain.MUMBAI)).toBe("MATIC_POLYGON_MUMBAI");
        });
    });

    describe("getBlockchainByChainId", () => {
        it("should return the correct blockchain for each chain ID", () => {
            expect(getBlockchainByChainId(1)).toBe(Blockchain.ETHEREUM);
            expect(getBlockchainByChainId(137)).toBe(Blockchain.POLYGON);
            expect(getBlockchainByChainId(56)).toBe(Blockchain.BSC);
            expect(getBlockchainByChainId(10)).toBe(Blockchain.OPTIMISM);
            expect(getBlockchainByChainId(42161)).toBe(Blockchain.ARBITRUM);
            expect(getBlockchainByChainId(5)).toBe(Blockchain.GOERLI);
            expect(getBlockchainByChainId(11155111)).toBe(Blockchain.SEPOLIA);
            expect(getBlockchainByChainId(80001)).toBe(Blockchain.MUMBAI);
        });

        it("returns undefined for invalid chain ID", () => {
            expect(getBlockchainByChainId(999)).toBeUndefined();
        });
    });

    describe("getChainIdByBlockchain", () => {
        it("should return the correct chain ID for each Blockchain", () => {
            expect(getChainIdByBlockchain(Blockchain.ETHEREUM)).toBe(1);
            expect(getChainIdByBlockchain(Blockchain.POLYGON)).toBe(137);
            expect(getChainIdByBlockchain(Blockchain.BSC)).toBe(56);
            expect(getChainIdByBlockchain(Blockchain.OPTIMISM)).toBe(10);
            expect(getChainIdByBlockchain(Blockchain.ARBITRUM)).toBe(42161);
            expect(getChainIdByBlockchain(Blockchain.GOERLI)).toBe(5);
            expect(getChainIdByBlockchain(Blockchain.SEPOLIA)).toBe(11155111);
            expect(getChainIdByBlockchain(Blockchain.MUMBAI)).toBe(80001);
        });
    });

    describe("getUrlProviderByBlockchain", () => {
        it("should return the correct url provider for each Blockchain", () => {
            expect(getUrlProviderByBlockchain(Blockchain.ETHEREUM)).toBe("https://eth.llamarpc.com");
            expect(getUrlProviderByBlockchain(Blockchain.POLYGON)).toBe("https://polygon.llamarpc.com");
            expect(getUrlProviderByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getUrlProviderByBlockchain(Blockchain.OPTIMISM)).toBe("https://optimism.llamarpc.com");
            expect(getUrlProviderByBlockchain(Blockchain.ARBITRUM)).toBe("https://arbitrum.llamarpc.com");
            expect(getUrlProviderByBlockchain(Blockchain.GOERLI)).toBe("https://ethereum-goerli.publicnode.com");
            expect(getUrlProviderByBlockchain(Blockchain.SEPOLIA)).toBe("https://ethereum-sepolia.publicnode.com");
            expect(getUrlProviderByBlockchain(Blockchain.MUMBAI)).toBe("https://rpc-mumbai.maticvigil.com");
        });
    });

    describe("getBlockExplorerByBlockchain", () => {
        it("should return the correct block explorer URL for each Blockchain", () => {
            expect(getBlockExplorerByBlockchain(Blockchain.ETHEREUM)).toBe("https://etherscan.io");
            expect(getBlockExplorerByBlockchain(Blockchain.POLYGON)).toBe("https://polygonscan.com");
            expect(getBlockExplorerByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getBlockExplorerByBlockchain(Blockchain.OPTIMISM)).toBe("https://optimistic.etherscan.io");
            expect(getBlockExplorerByBlockchain(Blockchain.ARBITRUM)).toBe("https://arbiscan.io");
            expect(getBlockExplorerByBlockchain(Blockchain.GOERLI)).toBe("https://goerli.etherscan.io");
            expect(getBlockExplorerByBlockchain(Blockchain.SEPOLIA)).toBe("https://sepolia.etherscan.io");
            expect(getBlockExplorerByBlockchain(Blockchain.MUMBAI)).toBe("https://mumbai.polygonscan.com");
        });
    });

    describe("getDisplayNameByBlockchain", () => {
        it("should return the correct display name for each Blockchain", () => {
            expect(getDisplayNameByBlockchain(Blockchain.ETHEREUM)).toBe("Ethereum Mainnet");
            expect(getDisplayNameByBlockchain(Blockchain.POLYGON)).toBe("Polygon Mainnet");
            expect(getDisplayNameByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getDisplayNameByBlockchain(Blockchain.OPTIMISM)).toBe("Optimism");
            expect(getDisplayNameByBlockchain(Blockchain.ARBITRUM)).toBe("Arbitrum");
            expect(getDisplayNameByBlockchain(Blockchain.GOERLI)).toBe("Goerli Tesnet");
            expect(getDisplayNameByBlockchain(Blockchain.SEPOLIA)).toBe("Sepolia Tesnet");
            expect(getDisplayNameByBlockchain(Blockchain.MUMBAI)).toBe("Mumbai Tesnet");
        });
    });

    describe("getTickerByBlockchain", () => {
        it("should return the correct ticker for each Blockchain", () => {
            expect(getTickerByBlockchain(Blockchain.ETHEREUM)).toBe("ETH");
            expect(getTickerByBlockchain(Blockchain.POLYGON)).toBe("MATIC");
            expect(getTickerByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getTickerByBlockchain(Blockchain.OPTIMISM)).toBe("OP");
            expect(getTickerByBlockchain(Blockchain.ARBITRUM)).toBe("ARB");
            expect(getTickerByBlockchain(Blockchain.GOERLI)).toBe("ETH");
            expect(getTickerByBlockchain(Blockchain.SEPOLIA)).toBe("ETH");
            expect(getTickerByBlockchain(Blockchain.MUMBAI)).toBe("MATIC");
        });
    });

    describe("getTickerNameByBlockchain", () => {
        it("should return the correct ticker name for each Blockchain", () => {
            expect(getTickerNameByBlockchain(Blockchain.ETHEREUM)).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain(Blockchain.POLYGON)).toBe("MATIC");
            expect(getTickerNameByBlockchain(Blockchain.BSC)).toBe("BNB_BSC");
            expect(getTickerNameByBlockchain(Blockchain.OPTIMISM)).toBe("OPTIMISM");
            expect(getTickerNameByBlockchain(Blockchain.ARBITRUM)).toBe("ARBITRUM");
            expect(getTickerNameByBlockchain(Blockchain.GOERLI)).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain(Blockchain.SEPOLIA)).toBe("ETHEREUM");
            expect(getTickerNameByBlockchain(Blockchain.MUMBAI)).toBe("MATIC");
        });
    });

    describe("getZeroDevProjectIdByBlockchain", () => {
        it("should return the correct ZeroDev project ID for each Blockchain", () => {
            expect(getZeroDevProjectIdByBlockchain(Blockchain.ETHEREUM)).toBe("9ee29857-8077-404b-9a9a-31eeea996a4a");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.POLYGON)).toBe("023d4a21-d801-4450-b629-24439ab1369d");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.BSC)).toBe("3d166617-da86-494b-9348-e8a13343bc04");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.OPTIMISM)).toBe("e9314f9e-a13d-414f-b965-c591a0248243");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.ARBITRUM)).toBe("1641cd99-c1ef-404a-9d26-a9dc67b1ba51");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.GOERLI)).toBe("3cfecfb6-9d7d-4ef6-acaa-ac8f79f6cd5a");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.SEPOLIA)).toBe("7ff22858-06f0-4f3a-8b46-5b41d8c75d0e");
            expect(getZeroDevProjectIdByBlockchain(Blockchain.MUMBAI)).toBe("9a334a4d-64d4-465c-ad81-856c6129e064");
        });
    });

    describe("getApiUrlByBlockchainType", () => {
        it("should return CROSSMINT_STG_URL for testnet blockchains", () => {
            expect(getApiUrlByBlockchainType(Blockchain.GOERLI)).toBe(CROSSMINT_STG_URL);
            expect(getApiUrlByBlockchainType(Blockchain.SEPOLIA)).toBe(CROSSMINT_STG_URL);
            expect(getApiUrlByBlockchainType(Blockchain.MUMBAI)).toBe(CROSSMINT_STG_URL);
        });

        it("should return CROSSMINT_PROD_URL for mainnet blockchains", () => {
            expect(getApiUrlByBlockchainType(Blockchain.ETHEREUM)).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType(Blockchain.POLYGON)).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType(Blockchain.BSC)).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType(Blockchain.OPTIMISM)).toBe(CROSSMINT_PROD_URL);
            expect(getApiUrlByBlockchainType(Blockchain.ARBITRUM)).toBe(CROSSMINT_PROD_URL);
        });
    });

    describe("getWeb3AuthBlockchain", () => {
        it("should return WEB3_AUTH_TESTNET for testnet blockchains", () => {
            expect(getWeb3AuthBlockchain(Blockchain.GOERLI)).toBe(WEB3_AUTH_TESTNET);
            expect(getWeb3AuthBlockchain(Blockchain.SEPOLIA)).toBe(WEB3_AUTH_TESTNET);
            expect(getWeb3AuthBlockchain(Blockchain.MUMBAI)).toBe(WEB3_AUTH_TESTNET);
        });

        it("should return WEB3_AUTH_MAINNET for mainnet blockchains", () => {
            expect(getWeb3AuthBlockchain(Blockchain.ETHEREUM)).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain(Blockchain.POLYGON)).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain(Blockchain.BSC)).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain(Blockchain.OPTIMISM)).toBe(WEB3_AUTH_MAINNET);
            expect(getWeb3AuthBlockchain(Blockchain.ARBITRUM)).toBe(WEB3_AUTH_MAINNET);
        });
    });

    describe("isTestnet", () => {
        it("should return true for testnet blockchains", () => {
            expect(isTestnet(Blockchain.GOERLI)).toBe(true);
            expect(isTestnet(Blockchain.SEPOLIA)).toBe(true);
            expect(isTestnet(Blockchain.MUMBAI)).toBe(true);
        });

        it("should return false for mainnet blockchains", () => {
            expect(isTestnet(Blockchain.ETHEREUM)).toBe(false);
            expect(isTestnet(Blockchain.POLYGON)).toBe(false);
            expect(isTestnet(Blockchain.BSC)).toBe(false);
            expect(isTestnet(Blockchain.OPTIMISM)).toBe(false);
            expect(isTestnet(Blockchain.ARBITRUM)).toBe(false);
        });
    });

    describe("isEVMBlockchain", () => {
        it("should return true for EVM blockchains", () => {
            expect(isEVMBlockchain(Blockchain.ETHEREUM)).toBe(true);
            expect(isEVMBlockchain(Blockchain.POLYGON)).toBe(true);
            expect(isEVMBlockchain(Blockchain.BSC)).toBe(true);
        });
    });
});
