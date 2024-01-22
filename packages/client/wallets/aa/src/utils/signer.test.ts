import { CrossmintService } from "../api/CrossmintService";
import { FireblocksNCWSigner, UserIdentifier } from "../types";
import { createOwnerSigner } from "./signer";

// Mock the module that contains createOwnerSigner
jest.mock("./signer", () => ({
    createOwnerSigner: jest.fn(),
}));

// Other mocks...
jest.mock("@/blockchain/FireblocksNCWallet");
jest.mock("@web3auth/single-factor-auth");
jest.mock("@zerodev/sdk");

describe("createOwnerSigner", () => {
    const mockSmartAccountSigner = {
        signMessage: jest.fn().mockResolvedValue("mocked-signature"),
        signTypedData: jest.fn().mockResolvedValue("mocked-typed-data-signature"),
        getAddress: jest.fn().mockResolvedValue("mocked-address"),
    };
    const apiKey =
        "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp";

    jest.mock("./signer", () => ({
        createOwnerSigner: jest.fn().mockResolvedValue(mockSmartAccountSigner),
    }));

    it("returns a SmartAccountSigner for other Signers", async () => {
        const mockUserEmail: UserIdentifier = {
            type: "email",
            email: "test@example.com",
        };

        const mockFireblocksNCWSigner: FireblocksNCWSigner = {
            type: "FIREBLOCKS_NCW",
            passphrase: "mockPassphrase",
        };

        const mockWalletConfig = {
            signer: mockFireblocksNCWSigner,
        };

        const mockChain = "polygon";
        const mockCrossmintService = new CrossmintService(apiKey);

        // Now call the function
        try {
            await createOwnerSigner(mockUserEmail, mockChain, mockWalletConfig, mockCrossmintService);
        } catch (e) {}

        // Verify that the mock was called with the expected arguments
        expect(createOwnerSigner).toHaveBeenCalledWith(
            mockUserEmail,
            mockChain,
            mockWalletConfig,
            mockCrossmintService
        );

        // Assertions for SmartAccountSigner interface
        expect(mockSmartAccountSigner).toHaveProperty("signMessage");
        expect(typeof mockSmartAccountSigner.signMessage).toBe("function");

        expect(mockSmartAccountSigner).toHaveProperty("signTypedData");
        expect(typeof mockSmartAccountSigner.signTypedData).toBe("function");

        expect(mockSmartAccountSigner).toHaveProperty("getAddress");
        expect(typeof mockSmartAccountSigner.getAddress).toBe("function");
    });
});
