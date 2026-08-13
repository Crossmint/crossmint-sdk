import { describe, expect, test } from "vitest";

import type { CrossmintEmbeddedCheckoutV3Props } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";
import { crossmintEmbeddedCheckoutV3Service } from "./crossmintEmbeddedCheckoutV3Service";

const apiClient = {
    buildUrl: (path: string) => `https://staging.crossmint.com${path}`,
    crossmint: { apiKey: "ck_staging_key" },
    internalConfig: { sdkMetadata: { name: "test-sdk", version: "1.0.0" } },
} as never;

function iframeUrl(props: Record<string, unknown>) {
    return new URL(
        crossmintEmbeddedCheckoutV3Service({ apiClient }).iframe.getUrl(props as CrossmintEmbeddedCheckoutV3Props)
    );
}

const ORDER = { orderId: "order-1", payment: { crypto: { enabled: false }, fiat: { enabled: true } } };

describe("crossmintEmbeddedCheckoutV3Service", () => {
    describe("iframe.getUrl", () => {
        describe("when the merchant takes the identity verification step over", () => {
            test("puts identityVerificationHandling on the url the checkout page reads", () => {
                const url = iframeUrl({ ...ORDER, identityVerificationHandling: "external" });

                expect(url.searchParams.get("identityVerificationHandling")).toBe("external");
            });
        });

        describe("when the merchant leaves the step to checkout", () => {
            test("omits the param rather than sending an empty value", () => {
                const url = iframeUrl(ORDER);

                expect(url.searchParams.has("identityVerificationHandling")).toBe(false);
            });
        });
    });
});
