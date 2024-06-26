import { SmartWalletSDK } from "../src/SmartWalletSDK";
import { SmartWalletSDKInitParams } from "../src/types";

jest.mock("@/api");
jest.mock("@/blockchain");
jest.mock("@/types");
jest.mock("@/utils");

describe("CrossmintAASDK", () => {
    let sdk: SmartWalletSDK;
    const mockInitParams: SmartWalletSDKInitParams = {
        clientApiKey:
            "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp",
    };

    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
        sdk = SmartWalletSDK.init(mockInitParams);
    });

    describe("init", () => {
        it("should initialize the SDK correctly", () => {
            expect(sdk).toBeInstanceOf(SmartWalletSDK);
        });
    });
});
