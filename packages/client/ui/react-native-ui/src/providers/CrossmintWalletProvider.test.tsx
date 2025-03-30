import { beforeEach, describe, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { createCrossmint } from "@crossmint/common-sdk-base";
import { CrossmintWallets, type EVMSmartWallet } from "@crossmint/wallets-sdk";

import { useCrossmint } from "../hooks/useCrossmint";
import { MOCK_API_KEY } from "../testUtils.js";

vi.mock("@crossmint/wallets-sdk", async () => {
    const actual = await vi.importActual("@crossmint/wallets-sdk");
    return {
        ...actual,
        CrossmintWallets: {
            from: vi.fn(),
        },
    };
});

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return {
        ...actual,
        createCrossmint: vi.fn(),
    };
});

vi.mock("../hooks/useCrossmint", async () => {
    const actual = await vi.importActual("../hooks/useCrossmint");
    return {
        ...actual,
        useCrossmint: vi.fn(),
    };
});

describe("CrossmintWalletProvider", () => {
    let mockSDK: CrossmintWallets;
    let mockWallet: EVMSmartWallet;
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(() => ({}) as any);
        vi.mocked(useCrossmint).mockReturnValue({
            crossmint: {
                apiKey: MOCK_API_KEY,
                jwt: "mock-jwt",
            },
            setJwt: () => {},
        });

        mockSDK = mock<CrossmintWallets>();
        mockWallet = mock<EVMSmartWallet>();
        vi.mocked(CrossmintWallets.from).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValue(mockWallet);
    });

    describe("getOrCreateWallet", () => {
        it.todo("should create a wallet");
    });
});
