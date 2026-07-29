import { describe, expect, test, vi } from "vitest";

import { createKycVerificationService } from "./kycVerificationService";

const apiClient = {
    buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
    crossmint: { apiKey: "ck_staging_key" },
    internalConfig: { sdkMetadata: { name: "test-sdk", version: "1.0.0" } },
} as never;

function iframeUrl(props: Record<string, unknown>) {
    return new URL(
        createKycVerificationService({ apiClient }).iframe.getUrl(
            props as Parameters<ReturnType<typeof createKycVerificationService>["iframe"]["getUrl"]>[0]
        )
    );
}

describe("createKycVerificationService", () => {
    describe("iframe.getUrl", () => {
        test("points at the standalone kyc-verification route", () => {
            const url = iframeUrl({ credentials: { provider: "persona", inquiryId: "inq-1" } });

            expect(url.pathname).toBe("/sdk/unstable/kyc-verification");
        });

        test("serializes credentials as JSON and appends the api key", () => {
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

        test("produces a url the route's own parser accepts", () => {
            const url = iframeUrl({ credentials: { provider: "persona", inquiryId: "inq-1" } });

            // Mirrors parseKycVerificationParams in crossbit-main: the route reads
            // this exact param and JSON.parses it.
            expect(() => JSON.parse(url.searchParams.get("credentials") ?? "")).not.toThrow();
            expect(url.searchParams.get("sdkMetadata")).toBeTruthy();
        });
    });
});
