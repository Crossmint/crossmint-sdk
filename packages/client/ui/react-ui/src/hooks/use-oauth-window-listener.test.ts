import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import type { OAuthProvider } from "@crossmint/common-sdk-auth";

const getOAuthUrl = vi.fn();
const handleRefreshAuthMaterial = vi.fn();

vi.mock("@/hooks", () => ({
    useCrossmintAuth: () => ({ crossmintAuth: { getOAuthUrl, handleRefreshAuthMaterial } }),
}));

import { useOAuthWindowListener } from "./useOAuthWindowListener";

// No prefetched URLs, so every click awaits getOAuthUrl.
const NO_PREFETCHED_URLS = { google: "", twitter: "" } as Record<OAuthProvider, string>;
const PREFETCHED_URLS = {
    google: "https://oauth.example/google",
    twitter: "https://oauth.example/twitter",
} as Record<OAuthProvider, string>;

// Kept outside the render callback so a superseded flow's writes are observable, and so the
// hook's useCallback sees the stable identity OAuthFlowProvider gives it in production.
const setError = vi.fn();

function fakeWindow(): Window {
    return {
        postMessage: vi.fn(),
        close: vi.fn(),
        closed: false,
        location: { href: "about:blank" },
    } as unknown as Window;
}

// PopupWindow.initEmpty opens a window by name, so every flow wraps the same popup.
function openPopup(): Window {
    const popup = fakeWindow();
    vi.spyOn(window, "open").mockReturnValue(popup);
    return popup;
}

function renderOAuthHook(urls = NO_PREFETCHED_URLS) {
    return renderHook(() => useOAuthWindowListener(urls, setError));
}

function deliver(source: Window, event: string, data: unknown) {
    const messageEvent = new MessageEvent("message", {
        data: { event, data },
        origin: "https://www.crossmint.com",
    });
    // jsdom's MessageEvent only accepts a real WindowProxy as `source`, so install the stub directly.
    Object.defineProperty(messageEvent, "source", { value: source });
    window.dispatchEvent(messageEvent);
}

function deliverAuthMaterial(source: Window, oneTimeSecret = "one-time-secret") {
    deliver(source, "authMaterialFromPopupCallback", { oneTimeSecret });
}

describe("useOAuthWindowListener", () => {
    afterEach(() => {
        // Before clearing the spies, not after: unmounting tears a live flow down, and testing
        // library's auto-cleanup runs late enough that those calls would land in the next test.
        cleanup();
        vi.restoreAllMocks();
        getOAuthUrl.mockReset();
        handleRefreshAuthMaterial.mockClear();
        setError.mockClear();
    });

    describe("when another window on the page sends the callback", () => {
        test("takes auth material only from the popup it opened", async () => {
            const popup = openPopup();

            const { result } = renderOAuthHook(PREFETCHED_URLS);
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

    describe("when a second provider is clicked while the first URL is still resolving", () => {
        test("leaves one listener pair on the shared popup, so the secret is redeemed once", async () => {
            const popup = openPopup();
            const resolvers: Array<(url: string) => void> = [];
            getOAuthUrl.mockImplementation(() => new Promise<string>((resolve) => resolvers.push(resolve)));

            const { result } = renderOAuthHook();

            await act(async () => {
                result.current.createPopupAndSetupListeners("google" as OAuthProvider);
                result.current.createPopupAndSetupListeners("twitter" as OAuthProvider);
                await waitFor(() => expect(resolvers).toHaveLength(2));
                resolvers[0]("https://oauth.example/google");
                resolvers[1]("https://oauth.example/twitter");
            });

            await waitFor(() => expect(popup.location.href).toBe("https://oauth.example/twitter"));

            await act(async () => {
                deliverAuthMaterial(popup);
            });
            expect(handleRefreshAuthMaterial).toHaveBeenCalledTimes(1);
        });

        test("leaves the popup, the error and the loading state to the flow that took over", async () => {
            const popup = openPopup();
            const resolvers: Array<(url: string) => void> = [];
            const rejecters: Array<(error: Error) => void> = [];
            getOAuthUrl.mockImplementation(
                () =>
                    new Promise<string>((resolve, reject) => {
                        resolvers.push(resolve);
                        rejecters.push(reject);
                    })
            );

            const { result } = renderOAuthHook();

            await act(async () => {
                result.current.createPopupAndSetupListeners("google" as OAuthProvider);
                result.current.createPopupAndSetupListeners("twitter" as OAuthProvider);
                await waitFor(() => expect(resolvers).toHaveLength(2));
                resolvers[1]("https://oauth.example/twitter");
            });
            await act(async () => {
                rejecters[0](new Error("google 500"));
            });

            expect(popup.location.href).toBe("https://oauth.example/twitter");
            expect(popup.close).not.toHaveBeenCalled();
            expect(setError).not.toHaveBeenCalledWith("google 500");
            expect(result.current.activeOAuthProvider).toBe("twitter");
        });
    });

    describe("when a second provider is clicked after the first flow is fully set up", () => {
        test("drops the first flow's listeners, so the secret is redeemed once", async () => {
            const popup = openPopup();
            const { result } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google" as OAuthProvider);
            });
            await act(async () => {
                await result.current.createPopupAndSetupListeners("twitter" as OAuthProvider);
            });

            await act(async () => {
                deliverAuthMaterial(popup);
            });

            expect(handleRefreshAuthMaterial).toHaveBeenCalledTimes(1);
            expect(popup.location.href).toBe("https://oauth.example/twitter");
        });
    });

    describe("when the popup reports auth material", () => {
        test("redeems the secret, then closes the popup and clears the loading state", async () => {
            const popup = openPopup();
            const { result } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google" as OAuthProvider);
            });
            await act(async () => {
                deliverAuthMaterial(popup, "secret");
            });

            expect(handleRefreshAuthMaterial).toHaveBeenCalledWith("secret");
            expect(popup.close).toHaveBeenCalled();
            expect(result.current.activeOAuthProvider).toBeNull();
        });
    });

    describe("when the provider unmounts mid-flow", () => {
        test("closes the popup it opened and stops redeeming what arrives after", async () => {
            const popup = openPopup();
            const { result, unmount } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google" as OAuthProvider);
            });
            unmount();

            expect(popup.close).toHaveBeenCalled();

            await act(async () => {
                deliverAuthMaterial(popup);
            });
            expect(handleRefreshAuthMaterial).not.toHaveBeenCalled();
        });

        test("does not publish an error for the flow it abandoned", async () => {
            openPopup();
            const rejecters: Array<(error: Error) => void> = [];
            getOAuthUrl.mockImplementation(() => new Promise<string>((_, reject) => rejecters.push(reject)));

            const { result, unmount } = renderOAuthHook();

            await act(async () => {
                result.current.createPopupAndSetupListeners("google" as OAuthProvider);
                await waitFor(() => expect(rejecters).toHaveLength(1));
            });
            unmount();
            await act(async () => {
                rejecters[0](new Error("google 500"));
            });

            expect(setError).not.toHaveBeenCalledWith("google 500");
        });
    });
});
