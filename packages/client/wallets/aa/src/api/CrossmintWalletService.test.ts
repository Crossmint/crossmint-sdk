import { CROSSMINT_STG_URL } from "../utils";
import { CrossmintWalletService } from "./CrossmintWalletService";

jest.mock("@/blockchain", () => ({
    getApiUrlByBlockchainType: jest.fn(),
}));
jest.mock("@/services/logging", () => ({
    logError: jest.fn(),
}));
jest.mock("@/utils/error", () => ({
    CrossmintServiceError: jest.fn(),
    errorToJSON: jest.fn(),
}));

describe("CrossmintService", () => {
    let crossmintService: CrossmintWalletService;
    const apiKey =
        "sk_staging_A4vDwAp4t5az6fVQMpQK6qapBnAqgpxrrD35TaFQnyKgxehNbd959uZeaHjNCadWDXrgLRAK1CxeasZjtYEq4TbFkKMBBvbQ9oinAxQf8LbHsSYW2DMzT8fBko3YGLq9t7ZiXZjmgkTioxGVUUjyLtWLeBKwNUDLgpshWjaoR7pKRnSE9SqhwjQbiK62VKiBTdA3KvHsyG9k8mLMcKrDyfXp";

    beforeEach(() => {
        crossmintService = new CrossmintWalletService(apiKey);
    });

    describe("constructor", () => {
        it("should initialize with correct headers and base URL", () => {
            expect(crossmintService).toBeDefined();

            expect(crossmintService["crossmintAPIHeaders"]).toEqual({
                accept: "application/json",
                "content-type": "application/json",
                "x-api-key": apiKey,
            });

            // Check if the base URL is correctly set to the staging URL
            expect(crossmintService["crossmintBaseUrl"]).toBe(CROSSMINT_STG_URL);
        });
    });

    describe("createSessionKey", () => {
        it("should call fetchCrossmintAPI with correct arguments", async () => {
            global.fetch = jest.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({}),
            });

            const address = "test-address";
            await crossmintService.createSessionKey(address);
            expect(global.fetch).toHaveBeenCalledWith(expect.any(String), expect.any(Object));
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });
});
