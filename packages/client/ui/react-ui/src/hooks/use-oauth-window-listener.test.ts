import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { OAuthProvider } from "@crossmint/common-sdk-auth";

const CROSSMINT_ORIGIN = "https://www.crossmint.com";

const handleRefreshAuthMaterial = vi.fn();

vi.mock("@/hooks", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_production_key" } }),
    useCrossmintAuth: () => ({ crossmintAuth: { handleRefreshAuthMaterial } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({ baseUrl: CROSSMINT_ORIGIN }),
}));

import { useOAuthWindowListener } from "./useOAuthWindowListener";

const OAUTH_URL_MAP = { google: "https://api.stytch.com/v1/public/oauth/google/start" } as Record<
    OAuthProvider,
    string
>;

function fakeWindow(): Window {
    return { postMessage: vi.fn(), close: vi.fn(), closed: false, location: { href: "" } } as unknown as Window;
}

async function openPopup() {
    const popup = fakeWindow();
    vi.spyOn(window, "open").mockReturnValue(popup);
    const { result } = renderHook(() => useOAuthWindowListener(OAUTH_URL_MAP, vi.fn()));
    await act(async () => {
        await result.current.createPopupAndSetupListeners("google" as OAuthProvider);
    });
    return popup;
}

async function deliverAuthMaterial({ source, origin }: { source: Window; origin: string }) {
    const event = new MessageEvent("message", {
        data: { event: "authMaterialFromPopupCallback", data: { oneTimeSecret: "one-time-secret" } },
        origin,
    });
    // jsdom's MessageEvent only accepts a real WindowProxy as `source`, so install the stub directly.
    Object.defineProperty(event, "source", { value: source });
    await act(async () => {
        window.dispatchEvent(event);
    });
}

describe("useOAuthWindowListener", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        handleRefreshAuthMaterial.mockClear();
    });

    describe.each([
        {
            context: "another window on the page sends the callback",
            sender: (_popup: Window) => ({ source: fakeWindow(), origin: CROSSMINT_ORIGIN }),
        },
        {
            // The popup is a named window: another page can navigate it and post from there.
            context: "the popup sends the callback from a non-Crossmint origin",
            sender: (popup: Window) => ({ source: popup, origin: "https://attacker.example" }),
        },
    ])("when $context", ({ sender }) => {
        test("ignores the auth material", async () => {
            const popup = await openPopup();

            await deliverAuthMaterial(sender(popup));

            expect(handleRefreshAuthMaterial).not.toHaveBeenCalled();
        });
    });

    describe("when the popup sends the callback from the Crossmint origin", () => {
        test("signs in with the one-time secret", async () => {
            const popup = await openPopup();

            await deliverAuthMaterial({ source: popup, origin: CROSSMINT_ORIGIN });

            expect(handleRefreshAuthMaterial).toHaveBeenCalledWith("one-time-secret");
        });
    });
});
