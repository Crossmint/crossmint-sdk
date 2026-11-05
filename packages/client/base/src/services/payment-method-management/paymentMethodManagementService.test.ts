import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
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
    it("serializes allowedModes and allowedPaymentMethodTypes into the iframe URL (array survives round-trip)", () => {
        const service = makeService();

        const url = service.iframe.getUrl({
            jwt: "jwt-token",
            allowedModes: ["new"],
            allowedPaymentMethodTypes: ["bank-account-us"],
        });

        const params = new URL(url).searchParams;
        expect(params.get("jwt")).toBe("jwt-token");
        expect(params.get("apiKey")).toBe("ck_staging_test");
        expect(JSON.parse(params.get("allowedModes") ?? "null")).toEqual(["new"]);
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
        expect(params.has("allowedModes")).toBe(false);
        expect(params.has("allowedPaymentMethodTypes")).toBe(false);
    });

    it("carries hideSubmitButton only when the host sets it, so the iframe default applies otherwise", () => {
        const service = makeService();

        expect(new URL(service.iframe.getUrl({ jwt: "jwt-token" })).searchParams.has("hideSubmitButton")).toBe(false);
        expect(
            new URL(service.iframe.getUrl({ jwt: "jwt-token", hideSubmitButton: false })).searchParams.has(
                "hideSubmitButton"
            )
        ).toBe(false);
        expect(
            new URL(service.iframe.getUrl({ jwt: "jwt-token", hideSubmitButton: true })).searchParams.get(
                "hideSubmitButton"
            )
        ).toBe("true");
    });

    it("carries fields only when the host sets it, so the iframe default applies otherwise", () => {
        const service = makeService();

        expect(new URL(service.iframe.getUrl({ jwt: "jwt-token" })).searchParams.has("fields")).toBe(false);
        expect(
            new URL(
                service.iframe.getUrl({ jwt: "jwt-token", fields: { billingDetails: { address: true } } })
            ).searchParams.get("fields")
        ).toBe('{"billingDetails":{"address":true}}');
        expect(
            new URL(
                service.iframe.getUrl({
                    jwt: "jwt-token",
                    fields: { billingDetails: { address: { line2: "hidden" } } },
                })
            ).searchParams.get("fields")
        ).toBe('{"billingDetails":{"address":{"line2":"hidden"}}}');
    });

    it("drops an empty allowedPaymentMethodTypes so the iframe applies the default", () => {
        const service = makeService();

        const url = service.iframe.getUrl({ jwt: "jwt-token", allowedPaymentMethodTypes: [] });

        // An empty array must not serialize as `[]` (which the iframe would read as
        // "offer no types"); the key is dropped so the documented default applies.
        expect(new URL(url).searchParams.has("allowedPaymentMethodTypes")).toBe(false);
    });
});

describe("paymentMethodManagementService.getUrl defaultValues", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    function captureWarnings() {
        return vi.spyOn(console, "warn").mockImplementation(() => undefined);
    }

    it("carries defaultValues as JSON in the iframe URL", () => {
        const defaultValues = {
            billingDetails: {
                address: {
                    country: "ES",
                    line1: "Calle Mayor 1",
                    line2: "2B",
                    city: "Madrid",
                    stateOrRegion: "Madrid",
                    postalCode: "28013",
                },
            },
        };

        const url = makeService().iframe.getUrl({ jwt: "jwt-token", defaultValues });

        expect(JSON.parse(new URL(url).searchParams.get("defaultValues") ?? "null")).toEqual(defaultValues);
    });

    it("omits defaultValues when the host does not set it", () => {
        const url = makeService().iframe.getUrl({ jwt: "jwt-token" });

        expect(new URL(url).searchParams.has("defaultValues")).toBe(false);
    });

    it("passes invalid values through, since the iframe validates them and only warns", () => {
        const warn = captureWarnings();
        const defaultValues = { billingDetails: { address: { country: "es", postalCode: "" } } };

        const url = makeService().iframe.getUrl({ jwt: "jwt-token", defaultValues });

        expect(JSON.parse(new URL(url).searchParams.get("defaultValues") ?? "null")).toEqual(defaultValues);
        expect(warn).not.toHaveBeenCalled();
    });

    it("passes a null address field through as no value, since stored data often has null for a blank field", () => {
        const warn = captureWarnings();
        const defaultValues = {
            billingDetails: { address: { country: "US", line1: "80 SW 8th St", line2: null, city: "Miami" } },
        };

        const url = makeService().iframe.getUrl({ jwt: "jwt-token", defaultValues });

        expect(JSON.parse(new URL(url).searchParams.get("defaultValues") ?? "null")).toEqual(defaultValues);
        expect(warn).not.toHaveBeenCalled();
    });

    it.each([
        ["defaultValues is a string", "ES", /defaultValues must be a plain object, got string/],
        ["defaultValues is null", null, /defaultValues must be a plain object, got null/],
        ["defaultValues is an array", [], /defaultValues must be a plain object, got an array/],
        [
            "billingDetails is a boolean",
            { billingDetails: true },
            /defaultValues\.billingDetails must be a plain object, got boolean/,
        ],
        [
            "address is a class instance",
            { billingDetails: { address: new Date() } },
            /defaultValues\.billingDetails\.address must be a plain object, got an instance of Date/,
        ],
        [
            "an address field is a number",
            { billingDetails: { address: { postalCode: 28013 } } },
            /defaultValues\.billingDetails\.address\.postalCode must be a string, got number/,
        ],
        [
            "an address field is a boolean",
            { billingDetails: { address: { line2: false } } },
            /defaultValues\.billingDetails\.address\.line2 must be a string, got boolean/,
        ],
        [
            "an address field is an object",
            { billingDetails: { address: { city: { name: "Madrid" } } } },
            /defaultValues\.billingDetails\.address\.city must be a string, got an instance of Object/,
        ],
    ])("throws when %s", (_, defaultValues, message) => {
        expect(() =>
            makeService().iframe.getUrl({
                jwt: "jwt-token",
                defaultValues: defaultValues as CrossmintPaymentMethodManagementProps["defaultValues"],
            })
        ).toThrow(message);
    });

    it.each([
        [
            "defaultValues",
            { billing: {} },
            'Unknown key "defaultValues.billing" is ignored. Known keys: billingDetails.',
        ],
        [
            "defaultValues.billingDetails",
            { billingDetails: { name: "Ana" } },
            'Unknown key "defaultValues.billingDetails.name" is ignored. Known keys: address.',
        ],
        [
            "defaultValues.billingDetails.address",
            { billingDetails: { address: { postal_code: "28013" } } },
            'Unknown key "defaultValues.billingDetails.address.postal_code" is ignored. Known keys: country, line1, line2, city, stateOrRegion, postalCode.',
        ],
    ])("warns about an unknown key under %s and passes it through", (_, defaultValues, message) => {
        const warn = captureWarnings();

        const url = makeService().iframe.getUrl({
            jwt: "jwt-token",
            defaultValues: defaultValues as CrossmintPaymentMethodManagementProps["defaultValues"],
        });

        expect(warn).toHaveBeenCalledWith(expect.stringContaining(message));
        expect(JSON.parse(new URL(url).searchParams.get("defaultValues") ?? "null")).toEqual(defaultValues);
    });

    it("logs each unknown-key warning once per service, since React rebuilds the URL on every render", () => {
        const warn = captureWarnings();
        const service = makeService();
        const props = { jwt: "jwt-token", defaultValues: { billingDetails: { address: { zip: "28013" } } } };

        service.iframe.getUrl(props as CrossmintPaymentMethodManagementProps);
        service.iframe.getUrl(props as CrossmintPaymentMethodManagementProps);

        expect(warn).toHaveBeenCalledTimes(1);
    });
});

describe("CrossmintPaymentMethodManagement types", () => {
    it("keeps allowedModes and allowedPaymentMethodTypes optional", () => {
        expectTypeOf<CrossmintPaymentMethodManagementProps["allowedModes"]>().toEqualTypeOf<
            Array<"new" | "existing"> | undefined
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
