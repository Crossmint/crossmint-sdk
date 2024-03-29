import { ethers } from "ethers";

import { BLOCKCHAIN_TESTNETS, EVM_CHAINS } from "@crossmint/common-sdk-base";

import { CrossmintAASDK } from "../src/CrossmintAASDK";
import { CrossmintAASDKInitParams, UserIdentifier, WalletConfig } from "../src/types";

jest.mock("@/api");
jest.mock("@/blockchain");
jest.mock("@/types");
jest.mock("@/utils");

describe("CrossmintAASDK", () => {
    let sdk: CrossmintAASDK;
    const mockInitParams: CrossmintAASDKInitParams = {
        apiKey: "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp",
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        sdk = CrossmintAASDK.init(mockInitParams);
    });

    describe("init", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(CrossmintAASDK);
        });
    });
    const allChains = [...EVM_CHAINS, ...BLOCKCHAIN_TESTNETS];

    describe.each(allChains)("getOrCreateWallet - With Fireblocks signer and %s network", (chain) => {
        const mockUser: UserIdentifier = {
            type: "email",
            email: "test@example.com",
        };
        const mockWalletConfig: WalletConfig = {
            signer: {
                type: "FIREBLOCKS_NCW",
                passphrase: "1234",
            },
        };

        it("should attempt to create or get a wallet", async () => {
            const spy = jest.spyOn(sdk, "getOrCreateWallet");

            try {
                await sdk.getOrCreateWallet(mockUser, chain, mockWalletConfig);
            } catch (e) {}

            expect(spy).toHaveBeenCalledWith(mockUser, chain, mockWalletConfig);
            spy.mockRestore();
        });
    });

    describe.each(allChains)("getOrCreateWallet - With ethers.Signer and %s network", (chain) => {
        const mockUser: UserIdentifier = {
            type: "email",
            email: "test@example.com",
        };
        const randomWallet = ethers.Wallet.createRandom();
        const mockWalletConfig: WalletConfig = {
            signer: randomWallet,
        };

        it("should attempt to create or get a wallet", async () => {
            const spy = jest.spyOn(sdk, "getOrCreateWallet");

            try {
                await sdk.getOrCreateWallet(mockUser, chain, mockWalletConfig);
            } catch (e) {}

            expect(spy).toHaveBeenCalledWith(mockUser, chain, mockWalletConfig);
            spy.mockRestore();
        });
    });
});
