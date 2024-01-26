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

});
