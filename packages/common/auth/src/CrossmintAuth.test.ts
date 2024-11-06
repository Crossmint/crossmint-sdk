import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintAuth } from "./CrossmintAuth";
import { type Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";

vi.mock("@crossmint/common-sdk-base");

describe("CrossmintAuth", () => {
    let crossmintAuth: CrossmintAuth;
    const mockCrossmint = { projectId: "test-project-id" };
    const mockApiClient = {
        baseUrl: "https://api.crossmint.com",
        get: vi.fn(),
        post: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(CrossmintApiClient).mockReturnValue(mockApiClient as unknown as CrossmintApiClient);
        crossmintAuth = CrossmintAuth.from(mockCrossmint as unknown as Crossmint);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("from", () => {
        it("should create a new CrossmintAuth instance", () => {
            expect(crossmintAuth).toBeInstanceOf(CrossmintAuth);
            expect(CrossmintApiClient).toHaveBeenCalledWith(mockCrossmint, expect.any(Object));
        });
    });

    describe("getJwksUri", () => {
        it("should return the correct JWKS URI", () => {
            expect(crossmintAuth.getJwksUri()).toBe("https://api.crossmint.com/.well-known/jwks.json");
        });
    });
});
