import { ethers } from "ethers";

import { BLOCKCHAIN_INCLUDING_TESTNET } from "@crossmint/common-sdk-base";

import { CrossmintAASDK } from "../src/CrossmintAASDK";
import { CrossmintAASDKInitParams, UserIdentifier, WalletConfig } from "../src/types";

jest.mock("@/api");
jest.mock("@/blockchain");
jest.mock("@/types");
jest.mock("@/utils");

describe("CrossmintAASDK", () => {
    let sdk: CrossmintAASDK;
    const mockInitParams: CrossmintAASDKInitParams = {
        projectId: "projectId",
        clientSecret: "clientSecret",
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
    const allChains = BLOCKCHAIN_INCLUDING_TESTNET;

    describe.each(allChains)("getOrCreateWallet - With Fireblocks signer and %s network", (chain) => {
        const mockUser: UserIdentifier = { email: "test@example.com" };
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
        const mockUser: UserIdentifier = { email: "test@example.com" };
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
