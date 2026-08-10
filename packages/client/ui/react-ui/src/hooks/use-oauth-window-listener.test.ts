import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { useOAuthWindowListener } from "./useOAuthWindowListener";

const childWindow = {
    on: vi.fn((event: string, _handler: (data: unknown) => unknown) => `listener-id:${event}`),
    off: vi.fn(),
};

// PopupWindow.initEmpty opens a window by name, so every call hands back the same popup.
const popupWindow = { location: { href: "about:blank" }, closed: false, close: vi.fn() };

vi.mock("@crossmint/client-sdk-window", () => ({
    ChildWindow: vi.fn(() => childWindow),
    PopupWindow: { initEmpty: vi.fn(() => ({ window: popupWindow })) },
}));

const getOAuthUrl = vi.fn();
const handleRefreshAuthMaterial = vi.fn();

vi.mock("@/hooks", () => ({
    useCrossmintAuth: () => ({
        crossmintAuth: { getOAuthUrl, handleRefreshAuthMaterial },
    }),
}));

// No prefetched URLs, so both clicks await getOAuthUrl.
const NO_PREFETCHED_URLS = { google: "", twitter: "" } as Parameters<typeof useOAuthWindowListener>[0];
const PREFETCHED_URLS = {
    google: "https://oauth.example/google",
    twitter: "https://oauth.example/twitter",
} as Parameters<typeof useOAuthWindowListener>[0];

// Kept outside the render callback so a superseded flow's writes are observable, and so the
// hook's useCallback sees the stable identity OAuthFlowProvider gives it in production.
const setError = vi.fn();

function renderOAuthHook(urls = NO_PREFETCHED_URLS) {
    return renderHook(() => useOAuthWindowListener(urls, setError));
}

function getListener(event: string) {
    const call = childWindow.on.mock.calls.find(([registeredEvent]) => registeredEvent === event);
    if (call == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    return call[1] as unknown as (data: unknown) => Promise<void> | void;
}

describe("useOAuthWindowListener", () => {
    afterEach(() => {
        // Before clearing the spies, not after: unmounting tears a live flow down, and testing
        // library's auto-cleanup runs late enough that those calls would land in the next test.
        cleanup();
        popupWindow.location.href = "about:blank";
        popupWindow.closed = false;
        vi.clearAllMocks();
    });

    describe("when a second provider is clicked while the first URL is still resolving", () => {
        test("registers one listener pair, so the popup's one-time secret is redeemed once", async () => {
            const resolvers: Array<(url: string) => void> = [];
            getOAuthUrl.mockImplementation(() => new Promise<string>((resolve) => resolvers.push(resolve)));

            const { result } = renderOAuthHook();

            await act(async () => {
                result.current.createPopupAndSetupListeners("google");
                result.current.createPopupAndSetupListeners("twitter");
                await waitFor(() => expect(resolvers).toHaveLength(2));
                resolvers[0]("https://oauth.example/google");
                resolvers[1]("https://oauth.example/twitter");
            });

            await waitFor(() => expect(childWindow.on).toHaveBeenCalledTimes(2));
            expect(childWindow.on).toHaveBeenCalledWith("authMaterialFromPopupCallback", expect.any(Function));
            expect(childWindow.on).toHaveBeenCalledWith("errorFromPopupCallback", expect.any(Function));
            expect(popupWindow.location.href).toBe("https://oauth.example/twitter");
        });

        test("leaves the popup, the error and the loading state to the flow that took over", async () => {
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
                result.current.createPopupAndSetupListeners("google");
                result.current.createPopupAndSetupListeners("twitter");
                await waitFor(() => expect(resolvers).toHaveLength(2));
                resolvers[1]("https://oauth.example/twitter");
            });
            await act(async () => {
                rejecters[0](new Error("google 500"));
            });

            expect(popupWindow.location.href).toBe("https://oauth.example/twitter");
            expect(popupWindow.close).not.toHaveBeenCalled();
            expect(setError).not.toHaveBeenCalledWith("google 500");
            expect(result.current.activeOAuthProvider).toBe("twitter");
        });
    });

    describe("when a second provider is clicked after the first flow is fully set up", () => {
        test("removes the first flow's listeners by their returned ids", async () => {
            const { result } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google");
            });
            expect(childWindow.off).not.toHaveBeenCalled();

            await act(async () => {
                await result.current.createPopupAndSetupListeners("twitter");
            });

            expect(childWindow.off).toHaveBeenCalledWith("listener-id:authMaterialFromPopupCallback");
            expect(childWindow.off).toHaveBeenCalledWith("listener-id:errorFromPopupCallback");
            expect(childWindow.off).toHaveBeenCalledTimes(2);
            expect(childWindow.on).toHaveBeenCalledTimes(4);
        });
    });

    describe("when the popup reports auth material", () => {
        test("redeems the secret, then closes the popup and clears the loading state", async () => {
            const { result } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google");
            });
            await act(async () => {
                await getListener("authMaterialFromPopupCallback")({ oneTimeSecret: "secret" });
            });

            expect(handleRefreshAuthMaterial).toHaveBeenCalledWith("secret");
            expect(popupWindow.close).toHaveBeenCalled();
            expect(result.current.activeOAuthProvider).toBeNull();
        });
    });

    describe("when the provider unmounts mid-flow", () => {
        test("removes the listeners and closes the popup it opened", async () => {
            const { result, unmount } = renderOAuthHook(PREFETCHED_URLS);

            await act(async () => {
                await result.current.createPopupAndSetupListeners("google");
            });
            unmount();

            expect(childWindow.off).toHaveBeenCalledWith("listener-id:authMaterialFromPopupCallback");
            expect(childWindow.off).toHaveBeenCalledWith("listener-id:errorFromPopupCallback");
            expect(popupWindow.close).toHaveBeenCalled();
        });

        test("does not publish an error for the flow it abandoned", async () => {
            const rejecters: Array<(error: Error) => void> = [];
            getOAuthUrl.mockImplementation(() => new Promise<string>((_, reject) => rejecters.push(reject)));

            const { result, unmount } = renderOAuthHook();

            await act(async () => {
                result.current.createPopupAndSetupListeners("google");
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
