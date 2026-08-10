import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { emit, iframeClient, resetIFrameEmitter } from "../../../tests/shared/iframeEmitter";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

vi.mock("@crossmint/client-sdk-base", async () => {
    const { iframeClient } = await import("../../../tests/shared/iframeEmitter");
    return {
        createPaymentMethodManagementService: () => ({
            iframe: {
                getUrl: () => "https://staging.crossmint.com/sdk/unstable/payment-method-management",
                createClient: () => iframeClient,
            },
        }),
    };
});

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({}),
}));

const PAYMENT_METHOD = { id: "pm-1", type: "card" };

function getIFrame() {
    return document.getElementById("crossmint-payment-method-management.iframe") as HTMLIFrameElement;
}

describe("<CrossmintPaymentMethodManagement />", () => {
    afterEach(() => {
        cleanup();
        resetIFrameEmitter();
    });

    describe("when the iframe relays events", () => {
        test("calls the callback from the latest render, not the one captured at subscribe time", () => {
            const stale = vi.fn();
            const fresh = vi.fn();
            const { rerender } = render(<CrossmintPaymentMethodManagement jwt="jwt" onPaymentMethodSelected={stale} />);

            rerender(<CrossmintPaymentMethodManagement jwt="jwt" onPaymentMethodSelected={fresh} />);
            emit("payment-method:selected", PAYMENT_METHOD);

            expect(fresh).toHaveBeenCalledWith(PAYMENT_METHOD);
            expect(stale).not.toHaveBeenCalled();
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintPaymentMethodManagement jwt="jwt" />);

            emit("ui:height.changed", { height: 480 });

            expect(getIFrame()).toHaveStyle({ height: "480px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintPaymentMethodManagement jwt="jwt" />);

            unmount();

            for (const event of ["ui:height.changed", "payment-method:selected"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(2);
        });
    });
});
