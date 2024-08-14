import { UserParams } from "../../../types/params";
import { SmartWalletConfig } from "../../../types/service";
import { SDK_VERSION } from "../../../utils/constants";
import { AccountConfigCache } from "./cache";

jest.mock("@/services/logging");
jest.mock("viem", () => ({
    keccak256: jest.fn((input) => `mocked_keccak256_${input}`),
    toHex: jest.fn((input) => `mocked_hex_${input}`),
}));

const mockData = {
    kernelVersion: "0.3.1",
    entryPointVersion: "v0.7",
    userId: "devlyn@paella.dev",
    signers: [
        {
            signerData: {
                entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
                validatorAddress: "0xbA45a2BFb8De3D24cA9D7F1B551E14dFF5d690Fd",
                pubKeyX: "110311240024954100085667226472791468894960420468782293097673057837941382345525",
                pubKeyY: "55639753423913323920634804373610812340711881298092778447611544058799129775494",
                authenticatorIdHash: "0xb7f951026ad956257e41c16f5e6c1c8969968356c9a8a8df916fcceda53f5c6a",
                authenticatorId: "u76dDdMEjTBgm68gbqfbaAlSoqE",
                passkeyName: "devlyn@paella.dev",
                validatorContractVersion: "0.0.2",
                domain: "localhost",
                type: "passkeys",
            },
        },
    ],
    smartContractWalletAddress: "0x7EAf93269C06Af4236E08d16d5220Df5f964eD87",
};

describe("AccountConfigCache", () => {
    let cache: AccountConfigCache;
    let mockStorage: Storage;

    const mockUser: UserParams = { jwt: "test_jwt" };
    const mockConfig: SmartWalletConfig = { someKey: "someValue" } as SmartWalletConfig;

    beforeEach(() => {
        mockStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn(),
            length: 0,
            key: jest.fn(),
        };
        cache = new AccountConfigCache(mockStorage);
    });

    describe("set", () => {
        it("should set the item in storage", () => {
            cache.set(mockUser, mockConfig);
            expect(mockStorage.setItem).toHaveBeenCalledWith(
                `smart-wallet-${SDK_VERSION}-mocked_keccak256_mocked_hex_test_jwt`,
                JSON.stringify(mockConfig)
            );
        });
    });

    describe("get", () => {
        it("should return null if item is not in storage", () => {
            mockStorage.getItem = jest.fn().mockReturnValue(null);
            const result = cache.get(mockUser);
            expect(result).toBeNull();
        });

        it("should return parsed config if valid", () => {
            mockStorage.getItem = jest.fn().mockReturnValue(JSON.stringify(mockConfig));
            const result = cache.get(mockUser);
            expect(result).toEqual(mockConfig);
        });

        it("should return null and remove item if config is invalid", () => {
            mockStorage.getItem = jest.fn().mockReturnValue('{"invalidKey": "invalidValue"}');
            const result = cache.get(mockUser);
            expect(result).toBeNull();
            expect(mockStorage.removeItem).toHaveBeenCalled();
        });
    });

    describe("clear", () => {
        it("should remove all items with the correct prefix", () => {
            mockStorage.length = 3;
            mockStorage.key = jest
                .fn()
                .mockReturnValueOnce(`smart-wallet-${SDK_VERSION}-key1`)
                .mockReturnValueOnce("other-key")
                .mockReturnValueOnce(`smart-wallet-${SDK_VERSION}-key2`);

            cache["clear"](); // Accessing private method for testing

            expect(mockStorage.removeItem).toHaveBeenCalledTimes(2);
            expect(mockStorage.removeItem).toHaveBeenCalledWith(`smart-wallet-${SDK_VERSION}-key1`);
            expect(mockStorage.removeItem).toHaveBeenCalledWith(`smart-wallet-${SDK_VERSION}-key2`);
        });
    });
});
