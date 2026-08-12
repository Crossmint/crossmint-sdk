import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { emit, iframeClient, resetIFrameEmitter } from "../../../tests/shared/iframeEmitter";
import { CrossmintIdentityVerification } from "./CrossmintIdentityVerification";

vi.mock("@crossmint/client-sdk-base", async () => {
    const { iframeClient } = await import("../../../tests/shared/iframeEmitter");
    return {
        createIdentityVerificationService: () => ({
            iframe: {
                getUrl: () => "https://staging.crossmint.com/sdk/unstable/identity-verification?credentials=%7B%7D",
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

const CREDENTIALS = { provider: "persona", inquiryId: "inq-1" } as const;

describe("<CrossmintIdentityVerification />", () => {
    afterEach(() => {
        cleanup();
        resetIFrameEmitter();
    });

    describe("when mounted", () => {
        test("renders an iframe pointed at the identity-verification route", () => {
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

            const iframe = screen.getByTitle("Identity verification");
            expect(iframe.getAttribute("src")).toContain("/sdk/unstable/identity-verification");
        });

        test("allows camera access only, which is all Persona's document capture needs", () => {
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

            expect(screen.getByTitle("Identity verification").getAttribute("allow")).toBe("camera");
        });
    });

    describe("when the iframe relays lifecycle events", () => {
        test("forwards kyc:ready to onReady", () => {
            const onReady = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onReady={onReady} />);

            emit("kyc:ready", {});

            expect(onReady).toHaveBeenCalled();
        });

        test("forwards kyc:completed to onComplete", () => {
            const onComplete = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onComplete={onComplete} />);

            emit("kyc:completed", { status: "verified" });

            expect(onComplete).toHaveBeenCalledWith({ status: "verified" });
        });

        test("forwards kyc:cancelled to onCancel", () => {
            const onCancel = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onCancel={onCancel} />);

            emit("kyc:cancelled", {});

            expect(onCancel).toHaveBeenCalled();
        });

        test("forwards kyc:error to onError with the retriable bit intact", () => {
            const onError = vi.fn();
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} onError={onError} />);

            emit("kyc:error", { retriable: false, reason: "widget-unavailable", message: "boom" });

            expect(onError).toHaveBeenCalledWith({
                retriable: false,
                reason: "widget-unavailable",
                message: "boom",
            });
        });

        test("calls the callback from the latest render, not the one captured at subscribe time", () => {
            const stale = vi.fn();
            const fresh = vi.fn();
            const { rerender } = render(<CrossmintIdentityVerification credentials={CREDENTIALS} onComplete={stale} />);

            rerender(<CrossmintIdentityVerification credentials={CREDENTIALS} onComplete={fresh} />);
            emit("kyc:completed", { status: "verified" });

            expect(fresh).toHaveBeenCalledWith({ status: "verified" });
            expect(stale).not.toHaveBeenCalled();
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

            emit("ui:height.changed", { height: 660 });

            expect(screen.getByTitle("Identity verification")).toHaveStyle({ height: "660px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintIdentityVerification credentials={CREDENTIALS} />);

            unmount();

            for (const event of ["ui:height.changed", "kyc:ready", "kyc:completed", "kyc:cancelled", "kyc:error"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(5);
        });
    });
});
