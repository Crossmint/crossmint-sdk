import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintCvcRecollection } from "./CrossmintCvcRecollection";

const listeners = new Map<string, (data: unknown) => void>();
// Returns an id distinct from the event name on purpose, so the unmount test
// fails if cleanup passes event names to off() instead of the returned ids.
const iframeClient = {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
        listeners.set(event, handler);
        return `listener-id:${event}`;
    }),
    off: vi.fn(),
};

vi.mock("@crossmint/client-sdk-base", () => ({
    createCvcRecollectionService: () => ({
        iframe: {
            getUrl: () => "https://staging.crossmint.com/sdk/unstable/cvc-recollection?jwt=jwt-1&paymentMethodId=pm_1",
            createClient: () => iframeClient,
        },
    }),
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({}),
}));

const PROPS = { jwt: "jwt-1", paymentMethodId: "pm_1" } as const;

function emit(event: string, data: unknown) {
    const handler = listeners.get(event);
    if (handler == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    act(() => handler(data));
}

describe("<CrossmintCvcRecollection />", () => {
    afterEach(() => {
        cleanup();
        listeners.clear();
        vi.clearAllMocks();
    });

    describe("when mounted", () => {
        test("renders an iframe pointed at the cvc-recollection route", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            const iframe = screen.getByTitle("CVC recollection");
            expect(iframe.getAttribute("src")).toContain("/sdk/unstable/cvc-recollection");
        });

        test("requests no device permissions, since the CVC field is a plain text element", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            expect(screen.getByTitle("CVC recollection").hasAttribute("allow")).toBe(false);
        });
    });

    describe("when the iframe relays lifecycle events", () => {
        test("forwards cvc:complete to onComplete with no arguments", () => {
            const onComplete = vi.fn();
            render(<CrossmintCvcRecollection {...PROPS} onComplete={onComplete} />);

            emit("cvc:complete", {});

            expect(onComplete).toHaveBeenCalledTimes(1);
            expect(onComplete).toHaveBeenCalledWith();
        });

        test("forwards cvc:error to onError with the retriable bit intact", () => {
            const onError = vi.fn();
            render(<CrossmintCvcRecollection {...PROPS} onError={onError} />);

            emit("cvc:error", { retriable: true, reason: "provider-error", message: "vault timeout" });

            expect(onError).toHaveBeenCalledWith({
                retriable: true,
                reason: "provider-error",
                message: "vault timeout",
            });
        });

        test("calls the callback from the latest render, not the one captured at subscribe time", () => {
            const stale = vi.fn();
            const fresh = vi.fn();
            const { rerender } = render(<CrossmintCvcRecollection {...PROPS} onComplete={stale} />);

            rerender(<CrossmintCvcRecollection {...PROPS} onComplete={fresh} />);
            emit("cvc:complete", {});

            expect(fresh).toHaveBeenCalledTimes(1);
            expect(stale).not.toHaveBeenCalled();
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintCvcRecollection {...PROPS} />);

            emit("ui:height.changed", { height: 220 });

            expect(screen.getByTitle("CVC recollection")).toHaveStyle({ height: "220px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintCvcRecollection {...PROPS} />);

            unmount();

            for (const event of ["ui:height.changed", "cvc:complete", "cvc:error"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(3);
        });
    });
});
