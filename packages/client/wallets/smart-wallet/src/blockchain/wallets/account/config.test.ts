import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import type { CrossmintWalletService } from "../../../api/CrossmintWalletService";
import type { SmartWalletConfig } from "../../../types/service";
import { mockConfig } from "../../../utils/test";
import { SmartWalletChain } from "../../chains";
import type { AccountConfigCache } from "./cache";
import { AccountConfigService } from "./config";
import { PasskeySignerConfig } from "./signer";

describe("AccountConfigService", () => {
    let service: AccountConfigService;
    const mockCrossmintService = mock<CrossmintWalletService>();
    const mockCache = mock<AccountConfigCache>();

    const mockUser = { jwt: "test_jwt" };
    const mockChain = SmartWalletChain.POLYGON_AMOY;

    beforeEach(() => {
        service = new AccountConfigService(mockCrossmintService, mockCache);
    });

    describe("get", () => {
        it("should return config from cache if available", async () => {
            mockCache.get.mockReturnValue(mockConfig);
            const result = await service.get(mockUser, mockChain);

            expect(result).toEqual({
                config: {
                    entryPointVersion: mockConfig.entryPointVersion,
                    kernelVersion: mockConfig.kernelVersion,
                    userWithId: { ...mockUser, id: mockConfig.userId },
                    existing: {
                        signerConfig: expect.any(PasskeySignerConfig),
                        address: mockConfig.smartContractWalletAddress,
                    },
                },
                cached: true,
            });
            expect(mockCache.get).toHaveBeenCalledWith(mockUser);
            expect(mockCrossmintService.getSmartWalletConfig).not.toHaveBeenCalled();
        });

        it("should fetch config from service if not in cache", async () => {
            mockCache.get.mockReturnValue(null);
            mockCrossmintService.getSmartWalletConfig.mockResolvedValue(mockConfig);

            const result = await service.get(mockUser, mockChain);

            expect(result).toEqual({
                config: {
                    entryPointVersion: mockConfig.entryPointVersion,
                    kernelVersion: mockConfig.kernelVersion,
                    userWithId: { ...mockUser, id: mockConfig.userId },
                    existing: {
                        signerConfig: expect.any(PasskeySignerConfig),
                        address: mockConfig.smartContractWalletAddress,
                    },
                },
                cached: false,
            });

            expect(mockCache.get).toHaveBeenCalledWith(mockUser);
            expect(mockCrossmintService.getSmartWalletConfig).toHaveBeenCalledWith(mockUser, mockChain);
        });

        it("should throw error for unsupported entryPoint and kernel version combination", async () => {
            const unsupportedConfig: SmartWalletConfig = {
                ...mockConfig,
                entryPointVersion: "v0.7" as const,
                kernelVersion: "0.2.4" as const,
            };
            mockCache.get.mockReturnValue(unsupportedConfig);

            await expect(service.get(mockUser, mockChain)).rejects.toThrow(
                "Unsupported combination: entryPoint v0.7 and kernel version 0.2.4. Please contact support"
            );
        });

        describe("incomplete configurations", () => {
            const testCases = [
                {
                    name: "only signer is present",
                    config: { ...mockConfig, smartContractWalletAddress: undefined },
                },
                {
                    name: "only address is present",
                    config: { ...mockConfig, signers: [] },
                },
            ];

            testCases.forEach(({ name, config }) => {
                it(`should throw error when ${name}`, async () => {
                    mockCache.get.mockReturnValue(config);
                    await expect(service.get(mockUser, mockChain)).rejects.toThrow(
                        "Either both signer and address must be present, or both must be null"
                    );
                });
            });
        });
    });
});
