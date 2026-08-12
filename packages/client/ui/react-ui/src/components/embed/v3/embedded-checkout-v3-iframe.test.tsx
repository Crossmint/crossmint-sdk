import "@testing-library/jest-dom/vitest";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { emit, iframeClient, resetIFrameEmitter } from "../../../../tests/shared/iframeEmitter";
import { EmbeddedCheckoutV3IFrame } from "./EmbeddedCheckoutV3IFrame";

vi.mock("@crossmint/client-sdk-base", async () => {
    const { iframeClient } = await import("../../../../tests/shared/iframeEmitter");
    return {
        crossmintEmbeddedCheckoutV3Service: () => ({
            iframe: {
                getUrl: () => "https://staging.crossmint.com/sdk/2024-03-05/embeddedCheckout",
                createClient: () => iframeClient,
            },
        }),
    };
});

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({ parsedAPIKey: { environment: "staging" } }),
}));

// Crypto disabled and no payer, so neither connection handler mounts and the iframe's own
// listeners are the only ones under test.
const PROPS = {
    lineItems: { collectionLocator: "crossmint:col-1" },
    payment: { crypto: { enabled: false }, fiat: { enabled: true } },
} as unknown as Parameters<typeof EmbeddedCheckoutV3IFrame>[0];

function getIFrame() {
    return document.getElementById("crossmint-embedded-checkout.iframe") as HTMLIFrameElement;
}

describe("<EmbeddedCheckoutV3IFrame />", () => {
    afterEach(() => {
        cleanup();
        resetIFrameEmitter();
    });

    describe("when the iframe relays events", () => {
        test("applies the relayed height to the iframe", () => {
            render(<EmbeddedCheckoutV3IFrame {...PROPS} />);

            emit("ui:height.changed", { height: 720 });

            expect(getIFrame()).toHaveStyle({ height: "720px" });
        });
    });

    describe("when unmounted", () => {
        test("removes both listeners by their returned ids, not by event name", () => {
            const { unmount } = render(<EmbeddedCheckoutV3IFrame {...PROPS} />);

            unmount();

            for (const event of ["ui:height.changed", "crypto:load"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(2);
        });
    });
});
