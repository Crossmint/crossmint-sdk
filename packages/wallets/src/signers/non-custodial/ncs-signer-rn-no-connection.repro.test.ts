import { afterEach, describe, expect, it, vi } from "vitest";
import type { EmailInternalSignerConfig } from "../types";
import { EVMNonCustodialSigner } from "./ncs-evm-signer";

vi.mock("@crossmint/common-sdk-base", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    validateAPIKey: () => ({ isValid: true, environment: "staging" }),
}));

describe("NCS email signer on React Native without clientTEEConnection", () => {
    afterEach(() => {
        (globalThis as { window?: unknown }).window = undefined;
    });

    it("does not leave an unhandled rejection from the DOM iframe fallback", async () => {
        const rejections: unknown[] = [];
        const onRejection = (reason: unknown) => rejections.push(reason);
        process.on("unhandledRejection", onRejection);
        // React Native: `window` is the global object, with no `location` and no `document`.
        (globalThis as { window?: unknown }).window = globalThis;

        new EVMNonCustodialSigner({
            type: "email",
            email: "alice@example.com",
            locator: "email:alice@example.com",
            address: "0x0000000000000000000000000000000000000000",
            crossmint: { apiKey: "ck_staging_test", jwt: "jwt" },
            clientTEEConnection: undefined,
            onAuthRequired: vi.fn(async () => {}),
        } as unknown as EmailInternalSignerConfig);
        await new Promise((resolve) => setTimeout(resolve, 50));
        process.off("unhandledRejection", onRejection);

        expect(rejections.map(String)).toEqual([]);
    });
});
