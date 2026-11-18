import { ApiClientError, CrossmintSDKError, WalletErrorCode } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import { mapWalletError } from "./CrossmintWalletBaseProvider";

const CLOUDFLARE_1009_BODY = `<!DOCTYPE html><html><head><title>Access denied</title></head><body>
Error 1009 Ray ID: abc123
Access denied: The owner of this website (crossmint.com) has banned the country or region your IP address is in (MM) from accessing this website.
</body></html>`;

const CROSSMINT_CUSTOM_GEOBLOCK_BODY = `<!DOCTYPE html>
<html>
<head>
    <style>body { font-family: Arial, sans-serif; text-align: center; }</style>
</head>
<body>
    <h1>Crossmint does not work in the following countries and regions:</h1>
    <div class="countries"><p>This service does not work in your country.</p></div>
</body>
</html>`;

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

    describe("when a 403 body is a Crossmint custom region-ban page", () => {
        test("maps to region-blocked", () => {
            expect(mapWalletError(apiClientError(403, CROSSMINT_CUSTOM_GEOBLOCK_BODY))).toEqual({
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
            expect(mapWalletError(new TypeError("Network request failed")).code).toBe("network");
        });
    });

    describe("when the error is a TypeError raised by config validation, not a request", () => {
        test("does not report it as network", () => {
            const error = new TypeError("Cannot read properties of null (reading 'type')");
            expect(mapWalletError(error).code).not.toBe("network");
        });
    });

    describe("when the error is a CrossmintSDKError carrying a code", () => {
        test("preserves the SDK code", () => {
            const error = new CrossmintSDKError("A quorum requires members", WalletErrorCode.SIGNER_INVALID);
            expect(mapWalletError(error)).toEqual({
                code: "wallet:signer-invalid",
                message: "A quorum requires members",
            });
        });

        test("unwraps an API error JSON body to its message field", () => {
            const error = new CrossmintSDKError(
                JSON.stringify({ statusCode: 400, message: "already a wallet with this address" }),
                WalletErrorCode.WALLET_CREATION_FAILED
            );
            expect(mapWalletError(error)).toEqual({
                code: "wallet:wallet-creation-failed",
                message: "already a wallet with this address",
            });
        });
    });

    describe("when the API error body carries a JSON message", () => {
        test("surfaces the body message instead of the request line", () => {
            const body = JSON.stringify({ message: "owner does not match the wallet's linked user" });
            expect(mapWalletError(apiClientError(400, body)).message).toBe(
                "owner does not match the wallet's linked user"
            );
        });
    });

    describe("when the error is anything else", () => {
        test("maps to unknown", () => {
            expect(mapWalletError(new Error("boom")).code).toBe("unknown");
        });
    });
});
