import { CrossmintService } from "../api/CrossmintService";
import { Blockchain } from "../blockchain";
import { FireblocksNCWSigner } from "../types";
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

    jest.mock("./signer", () => ({
        createOwnerSigner: jest.fn().mockResolvedValue(mockSmartAccountSigner),
    }));

    it("returns a SmartAccountSigner for other Signers", async () => {
        const mockUser = {
            email: "test@example.com",
            userId: "user123",
            phoneNumber: "1234567890",
        };

        const mockFireblocksNCWSigner: FireblocksNCWSigner = {
            type: "FIREBLOCKS_NCW",
            passphrase: "mockPassphrase",
        };

        const mockWalletConfig = {
            signer: mockFireblocksNCWSigner,
        };

        const mockChain = Blockchain.POLYGON;
        const mockCrossmintService = new CrossmintService("clientSecret", "projectId");

        // Now call the function
        try {
            await createOwnerSigner(mockUser, mockChain, mockWalletConfig, mockCrossmintService);
        } catch (e) {}

        // Verify that the mock was called with the expected arguments
        expect(createOwnerSigner).toHaveBeenCalledWith(mockUser, mockChain, mockWalletConfig, mockCrossmintService);

        // Assertions for SmartAccountSigner interface
        expect(mockSmartAccountSigner).toHaveProperty("signMessage");
        expect(typeof mockSmartAccountSigner.signMessage).toBe("function");

        expect(mockSmartAccountSigner).toHaveProperty("signTypedData");
        expect(typeof mockSmartAccountSigner.signTypedData).toBe("function");

        expect(mockSmartAccountSigner).toHaveProperty("getAddress");
        expect(typeof mockSmartAccountSigner.getAddress).toBe("function");
    });
});
