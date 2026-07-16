import { ApiClientError } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import { mapWalletError } from "./CrossmintWalletBaseProvider";

const CLOUDFLARE_1009_BODY = `<!DOCTYPE html><html><head><title>Access denied</title></head><body>
Error 1009 Ray ID: abc123
Access denied: The owner of this website (crossmint.com) has banned the country or region your IP address is in (MM) from accessing this website.
</body></html>`;

function apiClientError(status: number, body: string | null): ApiClientError {
    return new ApiClientError(`API request failed: ${status}`, status, "Forbidden", body);
}

describe("mapWalletError", () => {
    describe("when a 403 body carries the Cloudflare region-ban signature", () => {
        test("maps to region-blocked", () => {
            expect(mapWalletError(apiClientError(403, CLOUDFLARE_1009_BODY))).toEqual({
                code: "region-blocked",
                status: 403,
                message: "API request failed: 403",
            });
        });
    });

    describe("when a 403 body is a generic non-Cloudflare block", () => {
        test("maps to unknown so the auto-retry loop is not permanently suppressed", () => {
            const nginxBody =
                "<html><head><title>403 Forbidden</title></head><body><center><h1>403 Forbidden</h1></center></body></html>";
            expect(mapWalletError(apiClientError(403, nginxBody)).code).toBe("unknown");
        });
    });

    describe("when the error is a 5xx or 429", () => {
        test("maps to network", () => {
            expect(mapWalletError(apiClientError(502, "Bad Gateway")).code).toBe("network");
            expect(mapWalletError(apiClientError(429, "Too Many Requests")).code).toBe("network");
        });
    });

    describe("when the error is a rejected fetch (TypeError)", () => {
        test("maps to network", () => {
            expect(mapWalletError(new TypeError("Failed to fetch")).code).toBe("network");
        });
    });

    describe("when the error is anything else", () => {
        test("maps to unknown", () => {
            expect(mapWalletError(new Error("boom")).code).toBe("unknown");
        });
    });
});
