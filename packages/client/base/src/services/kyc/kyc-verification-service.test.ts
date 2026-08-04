import { describe, expect, test, vi } from "vitest";

import type { CrossmintKycVerificationProps } from "@/types/kyc/CrossmintKycVerificationProps";
import { createKycVerificationService } from "./kycVerificationService";

const apiClient = {
    buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
    crossmint: { apiKey: "ck_staging_key" },
    internalConfig: { sdkMetadata: { name: "test-sdk", version: "1.0.0" } },
} as never;

function iframeUrl(props: Record<string, unknown>) {
    return new URL(createKycVerificationService({ apiClient }).iframe.getUrl(props as CrossmintKycVerificationProps));
}

describe("createKycVerificationService", () => {
    describe("iframe.getUrl", () => {
        test("points at the standalone kyc-verification route", () => {
            const url = iframeUrl({ credentials: { provider: "persona", inquiryId: "inq-1" } });

            expect(url.pathname).toBe("/sdk/unstable/kyc-verification");
        });

        test("serializes credentials as JSON, the way the route's parser reads them", () => {
            const url = iframeUrl({
                credentials: { provider: "persona", inquiryId: "inq-1", sessionToken: "tok-1" },
                locale: "es-ES",
            });

            expect(JSON.parse(url.searchParams.get("credentials") ?? "")).toEqual({
                provider: "persona",
                inquiryId: "inq-1",
                sessionToken: "tok-1",
            });
            expect(url.searchParams.get("locale")).toBe("es-ES");
            expect(url.searchParams.get("apiKey")).toBe("ck_staging_key");
            expect(url.searchParams.get("sdkMetadata")).toBeTruthy();
        });

        test("omits the lifecycle callbacks from the query string", () => {
            const url = iframeUrl({
                credentials: { provider: "persona", inquiryId: "inq-1" },
                onComplete: vi.fn(),
                onError: vi.fn(),
                onReady: vi.fn(),
            });

            expect(url.searchParams.get("onComplete")).toBeNull();
            expect(url.searchParams.get("onError")).toBeNull();
            expect(url.searchParams.get("onReady")).toBeNull();
        });
    });
});
