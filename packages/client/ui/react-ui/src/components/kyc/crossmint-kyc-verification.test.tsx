import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { CrossmintKycVerification } from "./CrossmintKycVerification";

const listeners = new Map<string, (data: unknown) => void>();
// Returns an id distinct from the event name on purpose, so the unmount test
// fails if cleanup passes event names to off() instead of the returned ids.
// CrossmintPaymentMethodManagementIFrame has exactly that bug today.
const iframeClient = {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
        listeners.set(event, handler);
        return `listener-id:${event}`;
    }),
    off: vi.fn(),
};

vi.mock("@crossmint/client-sdk-base", () => ({
    createKycVerificationService: () => ({
        iframe: {
            getUrl: () => "https://staging.crossmint.com/sdk/unstable/kyc-verification?credentials=%7B%7D",
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

const CREDENTIALS = { provider: "persona", inquiryId: "inq-1" } as const;

function emit(event: string, data: unknown) {
    const handler = listeners.get(event);
    if (handler == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    act(() => handler(data));
}

describe("<CrossmintKycVerification />", () => {
    afterEach(() => {
        cleanup();
        listeners.clear();
        vi.clearAllMocks();
    });

    describe("when mounted", () => {
        test("renders an iframe pointed at the kyc-verification route", () => {
            render(<CrossmintKycVerification credentials={CREDENTIALS} />);

            const iframe = screen.getByRole("crossmint-kyc-verification.iframe");
            expect(iframe.getAttribute("src")).toContain("/sdk/unstable/kyc-verification");
        });

        test("allows camera access, which Persona's document capture needs", () => {
            render(<CrossmintKycVerification credentials={CREDENTIALS} />);

            expect(screen.getByRole("crossmint-kyc-verification.iframe").getAttribute("allow")).toContain("camera");
        });
    });

    describe("when the iframe relays lifecycle events", () => {
        test("forwards kyc:ready to onReady", () => {
            const onReady = vi.fn();
            render(<CrossmintKycVerification credentials={CREDENTIALS} onReady={onReady} />);

            emit("kyc:ready", {});

            expect(onReady).toHaveBeenCalled();
        });

        test("forwards kyc:completed to onComplete", () => {
            const onComplete = vi.fn();
            render(<CrossmintKycVerification credentials={CREDENTIALS} onComplete={onComplete} />);

            emit("kyc:completed", { status: "completed" });

            expect(onComplete).toHaveBeenCalledWith({ status: "completed" });
        });

        test("forwards a failed completion without turning it into an error", () => {
            const onComplete = vi.fn();
            const onError = vi.fn();
            render(<CrossmintKycVerification credentials={CREDENTIALS} onComplete={onComplete} onError={onError} />);

            emit("kyc:completed", { status: "failed" });

            expect(onComplete).toHaveBeenCalledWith({ status: "failed" });
            expect(onError).not.toHaveBeenCalled();
        });

        test("forwards kyc:error to onError", () => {
            const onError = vi.fn();
            render(<CrossmintKycVerification credentials={CREDENTIALS} onError={onError} />);

            emit("kyc:error", { message: "boom" });

            expect(onError).toHaveBeenCalledWith({ message: "boom" });
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintKycVerification credentials={CREDENTIALS} />);

            emit("ui:height.changed", { height: 660 });

            expect(screen.getByRole("crossmint-kyc-verification.iframe")).toHaveStyle({ height: "660px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintKycVerification credentials={CREDENTIALS} />);

            unmount();

            for (const event of ["ui:height.changed", "kyc:ready", "kyc:completed", "kyc:error"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(4);
        });
    });
});
