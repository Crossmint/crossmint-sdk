import { ethers } from "ethers";

import { BLOCKCHAIN_TEST_NET, EVM_CHAINS } from "@crossmint/common-sdk-base";

import { CrossmintAASDK } from "../src/CrossmintAASDK";
import { CrossmintAASDKInitParams, UserIdentifier, WalletConfig } from "../src/types";

jest.mock("@/api");
jest.mock("@/blockchain");
jest.mock("@/types");
jest.mock("@/utils");

describe("CrossmintAASDK", () => {
    let sdk: CrossmintAASDK;
    const mockInitParams: CrossmintAASDKInitParams = {
        apiKey: "apiKey",
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
    const allChains = [...EVM_CHAINS, ...BLOCKCHAIN_TEST_NET];
});
