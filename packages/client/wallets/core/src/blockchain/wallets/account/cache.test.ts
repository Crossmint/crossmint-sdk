import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserParams } from "../../../types/params";
import { mockConfig } from "../../../utils/test";
import { AccountConfigCache } from "./cache";

// At the top of the file, after the imports
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
};

vi.stubGlobal("localStorage", mockLocalStorage);

vi.mock("@/services/logging");
vi.mock("viem", () => ({
    keccak256: vi.fn((input) => `mocked_keccak256_${input}`),
    toHex: vi.fn((input) => `mocked_hex_${input}`),
    isAddress: vi.fn(() => true),
    isHex: vi.fn(() => true),
}));

describe("AccountConfigCache", () => {
    let cache: AccountConfigCache;
    const mockUser: UserParams = { jwt: "test_jwt" };
    const cachePrefix = `smart-wallet-0.1.0`;

    beforeEach(() => {
        cache = new AccountConfigCache(cachePrefix);
        vi.clearAllMocks();
    });

    describe("get", () => {
        it("should return null if item is not in storage", () => {
            mockLocalStorage.getItem.mockReturnValue(null);
            const result = cache.get(mockUser);
            expect(result).toBeNull();
        });

        it("should return parsed config if valid", () => {
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(mockConfig));
            const result = cache.get(mockUser);
            expect(result).toEqual(mockConfig);
        });

        it("should return null and remove item if config is invalid", () => {
            mockLocalStorage.getItem.mockReturnValue('{"invalidKey": "invalidValue"}');
            const result = cache.get(mockUser);
            expect(result).toBeNull();
            expect(mockLocalStorage.removeItem).toHaveBeenCalled();
        });
    });

    describe("set", () => {
        it("should store the config in localStorage", () => {
            cache.set(mockUser, mockConfig);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                expect.stringContaining(cachePrefix),
                JSON.stringify(mockConfig)
            );
        });
    });
});
