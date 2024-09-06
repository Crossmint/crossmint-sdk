import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CROSSMINT_STG_URL } from "@crossmint/common-sdk-base";

import { CrossmintWalletService } from "./CrossmintWalletService";

vi.mock("../services/logging", () => ({
    logError: vi.fn(),
    logInfo: vi.fn(),
}));

vi.mock("../utils/helpers", () => ({
    isLocalhost: vi.fn().mockReturnValue(true),
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

    afterEach(() => {
        vi.clearAllMocks();
    });
});
