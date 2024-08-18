import { beforeEach, describe, expect, it } from "vitest";
import { mock } from "vitest-mock-extended";

import { CrossmintWalletService } from "../../../api/CrossmintWalletService";
import { SmartWalletError } from "../../../error";
import { SmartWalletConfig } from "../../../types/service";
import { SmartWalletChain } from "../../chains";
import { AccountConfigCache } from "./cache";
import { AccountConfigFacade } from "./config";
import { PasskeySignerConfig } from "./signer";

describe("AccountConfigFacade", () => {
    let facade: AccountConfigFacade;
    const mockCrossmintService = mock<CrossmintWalletService>();
    const mockCache = mock<AccountConfigCache>();

    const mockUser = { jwt: "test_jwt" };
    const mockChain = SmartWalletChain.POLYGON_AMOY;

    const mockConfig: SmartWalletConfig = {
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
                    validatorContractVersion: "0.0.2" as any,
                    domain: "localhost",
                    type: "passkeys",
                },
            },
        ],
        smartContractWalletAddress: "0x7EAf93269C06Af4236E08d16d5220Df5f964eD87",
    };

    beforeEach(() => {
        facade = new AccountConfigFacade(mockCrossmintService, mockCache);
    });

    describe("get", () => {
        it("should return config from cache if available", async () => {
            mockCache.get.mockReturnValue(mockConfig);
            const result = await facade.get(mockUser, mockChain);

            expect(result).toEqual({
                entryPointVersion: mockConfig.entryPointVersion,
                kernelVersion: mockConfig.kernelVersion,
                userId: mockConfig.userId,
                existing: { signer: expect.any(PasskeySignerConfig), address: mockConfig.smartContractWalletAddress },
            });
            expect(mockCache.get).toHaveBeenCalledWith(mockUser);
            expect(mockCrossmintService.getSmartWalletConfig).not.toHaveBeenCalled();
        });

        it("should fetch config from service if not in cache", async () => {
            mockCache.get.mockReturnValue(null);
            mockCrossmintService.getSmartWalletConfig.mockResolvedValue(mockConfig);

            const result = await facade.get(mockUser, mockChain);

            expect(result).toEqual({
                entryPointVersion: mockConfig.entryPointVersion,
                kernelVersion: mockConfig.kernelVersion,
                userId: mockConfig.userId,
                existing: { signer: expect.any(PasskeySignerConfig), address: mockConfig.smartContractWalletAddress },
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

            await expect(facade.get(mockUser, mockChain)).rejects.toThrow(
                "Unsupported combination: entryPoint v0.7 and kernel version 0.2.4. Please contact support"
            );
        });

        it("should throw error when only signer is present", async () => {
            const incompleteConfig: SmartWalletConfig = {
                ...mockConfig,
                smartContractWalletAddress: undefined,
            };
            mockCache.get.mockReturnValue(incompleteConfig);

            await expect(facade.get(mockUser, mockChain)).rejects.toThrow(
                "Either both signer and address must be present, or both must be null"
            );
        });
    });
});
