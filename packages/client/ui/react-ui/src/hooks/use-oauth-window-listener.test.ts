import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { OAuthProvider } from "@crossmint/common-sdk-auth";

const handleRefreshAuthMaterial = vi.fn();

vi.mock("@/hooks", () => ({
    useCrossmintAuth: () => ({ crossmintAuth: { handleRefreshAuthMaterial } }),
}));

import { useOAuthWindowListener } from "./useOAuthWindowListener";

const OAUTH_URL_MAP = { google: "https://www.crossmint.com/auth/oauth/google" } as Record<OAuthProvider, string>;

function fakeWindow(): Window {
    return { postMessage: vi.fn(), close: vi.fn(), closed: false, location: { href: "" } } as unknown as Window;
}

function deliverAuthMaterial(source: Window) {
    const event = new MessageEvent("message", {
        data: { event: "authMaterialFromPopupCallback", data: { oneTimeSecret: "one-time-secret" } },
        origin: "https://www.crossmint.com",
    });
    // jsdom's MessageEvent only accepts a real WindowProxy as `source`, so install the stub directly.
    Object.defineProperty(event, "source", { value: source });
    window.dispatchEvent(event);
}

describe("useOAuthWindowListener", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        handleRefreshAuthMaterial.mockClear();
    });

    describe("when another window on the page sends the callback", () => {
        test("takes auth material only from the popup it opened", async () => {
            const popup = fakeWindow();
            vi.spyOn(window, "open").mockReturnValue(popup);

            const { result } = renderHook(() => useOAuthWindowListener(OAUTH_URL_MAP, vi.fn()));
            await act(async () => {
                await result.current.createPopupAndSetupListeners("google" as OAuthProvider);
            });

            await act(async () => {
                deliverAuthMaterial(fakeWindow());
            });
            expect(handleRefreshAuthMaterial).not.toHaveBeenCalled();

            await act(async () => {
                deliverAuthMaterial(popup);
            });
            expect(handleRefreshAuthMaterial).toHaveBeenCalledWith("one-time-secret");
        });
    });
});
