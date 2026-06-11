import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { describe, expect, expectTypeOf, it } from "vitest";
import type {
    CrossmintPaymentMethod,
    CrossmintPaymentMethodManagementProps,
} from "@/types/payment-method-management/CrossmintPaymentMethodManagementProps";
import { createPaymentMethodManagementService } from "./paymentMethodManagementService";

function makeService() {
    const apiClient = {
        buildUrl: (path: string) => `https://staging.crossmint.com/api${path}`,
        crossmint: { apiKey: "ck_staging_test" },
        internalConfig: { sdkMetadata: { name: "test-sdk", version: "0.0.0" } },
    } as unknown as CrossmintApiClient;
    return createPaymentMethodManagementService({ apiClient });
}

describe("paymentMethodManagementService.getUrl", () => {
    it("serializes mode and allowedPaymentMethodTypes into the iframe URL (array survives round-trip)", () => {
        const service = makeService();

        const url = service.iframe.getUrl({
            jwt: "jwt-token",
            mode: "new-only",
            allowedPaymentMethodTypes: ["bank-account-us"],
        });

        const params = new URL(url).searchParams;
        expect(params.get("jwt")).toBe("jwt-token");
        expect(params.get("apiKey")).toBe("ck_staging_test");
        expect(params.get("mode")).toBe("new-only");
        // appendObjectToQueryParams JSON.stringifies arrays into a single param.
        expect(JSON.parse(params.get("allowedPaymentMethodTypes") ?? "null")).toEqual(["bank-account-us"]);
    });

    it("preserves a multi-entry allowedPaymentMethodTypes array through the query param", () => {
        const service = makeService();

        const url = service.iframe.getUrl({
            jwt: "jwt-token",
            allowedPaymentMethodTypes: ["card", "bank-account-us"],
        });

        const raw = new URL(url).searchParams.get("allowedPaymentMethodTypes");
        expect(JSON.parse(raw ?? "null")).toEqual(["card", "bank-account-us"]);
    });

    it("omits optional props that are not provided", () => {
        const service = makeService();

        const url = service.iframe.getUrl({ jwt: "jwt-token" });

        const params = new URL(url).searchParams;
        expect(params.has("mode")).toBe(false);
        expect(params.has("allowedPaymentMethodTypes")).toBe(false);
    });
});

describe("CrossmintPaymentMethodManagement types", () => {
    it("keeps mode and allowedPaymentMethodTypes optional", () => {
        expectTypeOf<CrossmintPaymentMethodManagementProps["mode"]>().toEqualTypeOf<
            "new-only" | "new-and-existing" | undefined
        >();
        expectTypeOf<CrossmintPaymentMethodManagementProps["allowedPaymentMethodTypes"]>().toEqualTypeOf<
            ("card" | "bank-account-us")[] | undefined
        >();
        // jwt-only construction must remain valid (props stay optional).
        const minimal: CrossmintPaymentMethodManagementProps = { jwt: "x" };
        expect(minimal.jwt).toBe("x");
    });

    it("is a discriminated union narrowable on type", () => {
        const card: CrossmintPaymentMethod = {
            type: "card",
            paymentMethodId: "pm_card",
            card: {
                source: { type: "basis-theory-token", id: "tok_1" },
                brand: "visa",
                last4: "4242",
                expiration: { month: "12", year: "2030" },
            },
        };
        const bank: CrossmintPaymentMethod = {
            type: "bank-account-us",
            paymentMethodId: "pm_bank",
            bankAccount: { accountSuffix: "6789", bankName: "Wells Fargo", accountType: "checking" },
        };

        function summarize(pm: CrossmintPaymentMethod): string {
            if (pm.type === "bank-account-us") {
                expectTypeOf(pm.bankAccount.accountSuffix).toBeString();
                // @ts-expect-error - bank variant has no `card` field
                pm.card;
                return pm.bankAccount.accountSuffix;
            }
            expectTypeOf(pm.card.source.id).toBeString();
            return pm.card.last4;
        }

        expect(summarize(card)).toBe("4242");
        expect(summarize(bank)).toBe("6789");
    });
});
