import { describe, expect, test } from "vitest";

import type { Order } from "@/lib/hosted-checkout/Order";
import { getIdentityVerificationCredentials } from "./getIdentityVerificationCredentials";

function order(preparation: unknown): Order {
    return { orderId: "order-1", payment: { status: "requires-kyc", preparation } } as Order;
}

describe("getIdentityVerificationCredentials", () => {
    test("returns the credentials an order carries for its verification step", () => {
        const credentials = { provider: "persona", inquiryId: "inq-1", sessionToken: "tok-1", environmentId: null };

        expect(getIdentityVerificationCredentials(order({ kyc: credentials }))).toEqual(credentials);
    });

    // A crypto order's preparation shape, which is what the type actually models today.
    test("returns undefined when the preparation is not a verification one", () => {
        expect(getIdentityVerificationCredentials(order({ chain: "base", payerAddress: "0x1" }))).toBeUndefined();
    });

    test("returns undefined before the order needs verification", () => {
        expect(getIdentityVerificationCredentials(order(undefined))).toBeUndefined();
    });

    // Orders reach a merchant over postMessage, so a shape the type forbids still has to not throw.
    test("returns undefined for an order carrying no payment at all", () => {
        expect(getIdentityVerificationCredentials({ orderId: "order-1" } as Order)).toBeUndefined();
    });
});
