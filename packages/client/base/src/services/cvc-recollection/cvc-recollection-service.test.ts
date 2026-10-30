import { describe, expect, expectTypeOf, test, vi } from "vitest";

import type { CrossmintCvcRecollectionProps, CvcRecollectionError } from "@/types/cvc-recollection";
import type { OrderIntentEncryptedCardRail, OrderIntentRail } from "@/types/payment-method-management/OrderIntents";
import { createCvcRecollectionService } from "./cvcRecollectionService";

const apiClient = {
    buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
    crossmint: { apiKey: "ck_staging_key" },
    internalConfig: { sdkMetadata: { name: "test-sdk", version: "1.0.0" } },
} as never;

function iframeUrl(props: Record<string, unknown>) {
    return new URL(createCvcRecollectionService({ apiClient }).iframe.getUrl(props as CrossmintCvcRecollectionProps));
}

describe("createCvcRecollectionService", () => {
    describe("iframe.getUrl", () => {
        test("points at the standalone cvc-recollection route", () => {
            const url = iframeUrl({ jwt: "jwt-1", paymentMethodId: "pm_1" });

            expect(url.pathname).toBe("/sdk/unstable/cvc-recollection");
        });

        test("carries the jwt and paymentMethodId the hosted page needs", () => {
            const url = iframeUrl({ jwt: "jwt-1", paymentMethodId: "pm_1" });

            expect(url.searchParams.get("jwt")).toBe("jwt-1");
            expect(url.searchParams.get("paymentMethodId")).toBe("pm_1");
        });

        test("appends the integrator apiKey and the sdkMetadata", () => {
            const url = iframeUrl({ jwt: "jwt-1", paymentMethodId: "pm_1" });

            expect(url.searchParams.get("apiKey")).toBe("ck_staging_key");
            expect(JSON.parse(url.searchParams.get("sdkMetadata") ?? "")).toEqual({
                name: "test-sdk",
                version: "1.0.0",
            });
        });

        test("serializes appearance as JSON when passed", () => {
            const appearance = {
                variables: { colors: { accent: "#123456" } },
                rules: { Input: { borderRadius: "4px" } },
            };
            const url = iframeUrl({ jwt: "jwt-1", paymentMethodId: "pm_1", appearance });

            expect(JSON.parse(url.searchParams.get("appearance") ?? "")).toEqual(appearance);
        });

        test("leaves appearance out when not passed", () => {
            const url = iframeUrl({ jwt: "jwt-1", paymentMethodId: "pm_1" });

            expect(url.searchParams.has("appearance")).toBe(false);
        });

        test("omits the lifecycle callbacks from the query string", () => {
            const url = iframeUrl({
                jwt: "jwt-1",
                paymentMethodId: "pm_1",
                onComplete: vi.fn(),
                onError: vi.fn(),
            });

            expect(url.searchParams.get("onComplete")).toBeNull();
            expect(url.searchParams.get("onError")).toBeNull();
        });
    });
});

describe("CvcRecollectionError", () => {
    test("mirrors the cvc:error event payload", () => {
        expectTypeOf<CvcRecollectionError>().toEqualTypeOf<{
            retriable: boolean;
            reason:
                | "widget-unavailable"
                | "invalid-configuration"
                | "invalid-credentials"
                | "provider-error"
                | "verification-refused"
                | "unknown";
            message: string;
        }>();
    });
});

describe("OrderIntentEncryptedCardRail", () => {
    test("is active or pending_cvc_recollection without an error", () => {
        const active: OrderIntentEncryptedCardRail = {
            rail: "encrypted-card",
            status: "active",
            credentialFormats: ["card"],
        };
        const pending: OrderIntentEncryptedCardRail = {
            rail: "encrypted-card",
            status: "pending_cvc_recollection",
            credentialFormats: ["card"],
        };

        expect(active.error).toBeUndefined();
        expect(pending.error).toBeUndefined();
    });

    test("requires an error code when the status is error", () => {
        const errored: OrderIntentEncryptedCardRail = {
            rail: "encrypted-card",
            status: "error",
            error: { code: "vault-unavailable" },
            credentialFormats: ["card"],
        };

        // @ts-expect-error - status "error" without an error object is not a valid rail
        const missingError: OrderIntentEncryptedCardRail = {
            rail: "encrypted-card",
            status: "error",
            credentialFormats: ["card"],
        };

        expect(errored.error.code).toBe("vault-unavailable");
        expect(missingError.status).toBe("error");
    });

    test("never carries the agentic-token pending_verification status", () => {
        // @ts-expect-error - pending_verification belongs to agentic-token and spt, not encrypted-card
        const rail: OrderIntentEncryptedCardRail = {
            rail: "encrypted-card",
            status: "pending_verification",
            credentialFormats: ["card"],
        };

        expect(rail.rail).toBe("encrypted-card");
    });

    test("stays a member of the OrderIntentRail union", () => {
        expectTypeOf<OrderIntentEncryptedCardRail>().toMatchTypeOf<OrderIntentRail>();
    });
});
