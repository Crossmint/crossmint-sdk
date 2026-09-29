import { act, render, waitFor } from "@testing-library/react";
import type React from "react";
import { useContext } from "react";
import * as WebBrowser from "expo-web-browser";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AuthContext, CrossmintAuthProvider } from "./CrossmintAuthProvider";

const { crossmintAuth, platform, setJwt } = vi.hoisted(() => ({
    crossmintAuth: {
        getOAuthUrl: vi.fn(),
        handleRefreshAuthMaterial: vi.fn(),
    },
    platform: { OS: "ios" },
    setJwt: vi.fn(),
}));

vi.mock("react-native", () => ({ Platform: platform }));

vi.mock("expo-constants", () => ({
    default: { executionEnvironment: "standalone", appOwnership: null, expoVersion: undefined, expoConfig: {} },
}));

vi.mock("expo-web-browser", () => ({
    warmUpAsync: vi.fn(async () => {}),
    coolDownAsync: vi.fn(async () => {}),
    openBrowserAsync: vi.fn(async () => ({ type: "opened" })),
    openAuthSessionAsync: vi.fn(),
}));

vi.mock("expo-secure-store", () => ({
    getItemAsync: vi.fn(async () => null),
    setItemAsync: vi.fn(async () => {}),
    deleteItemAsync: vi.fn(async () => {}),
    isAvailableAsync: vi.fn(async () => true),
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    CrossmintAuthBaseProvider: ({ children }: { children: React.ReactNode }) => children,
    useCrossmintAuthBase: () => ({
        crossmintAuth,
        status: "logged-out",
        jwt: undefined,
        user: undefined,
        logout: vi.fn(),
        getUser: vi.fn(),
    }),
    useCrossmint: () => ({ setJwt }),
}));

const APP_SCHEMA = "crossmint-wallets";
const GOOGLE_OAUTH_URL = "https://staging.crossmint.com/oauth/google?appSchema=crossmint-wallets";
const TWITTER_OAUTH_URL = "https://staging.crossmint.com/oauth/twitter?appSchema=crossmint-wallets";
const REDIRECT_URL = `${APP_SCHEMA}://auth?oneTimeSecret=secret%2Fvalue&state=abc`;

function renderProvider() {
    const context: { current?: React.ContextType<typeof AuthContext> } = {};
    function Probe() {
        context.current = useContext(AuthContext);
        return null;
    }
    render(
        <CrossmintAuthProvider appSchema={APP_SCHEMA}>
            <Probe />
        </CrossmintAuthProvider>
    );
    return context;
}

describe("CrossmintAuthProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        platform.OS = "ios";
        crossmintAuth.getOAuthUrl.mockImplementation(async (provider: string) =>
            provider === "google" ? GOOGLE_OAUTH_URL : TWITTER_OAUTH_URL
        );
        crossmintAuth.handleRefreshAuthMaterial.mockResolvedValue({ jwt: "jwt" });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test("prefetches the OAuth URLs with the app schema", async () => {
        renderProvider();

        await waitFor(() => expect(crossmintAuth.getOAuthUrl).toHaveBeenCalledTimes(2));
        expect(crossmintAuth.getOAuthUrl).toHaveBeenCalledWith("google", { appSchema: APP_SCHEMA });
        expect(crossmintAuth.getOAuthUrl).toHaveBeenCalledWith("twitter", { appSchema: APP_SCHEMA });
    });

    describe("loginWithOAuth on iOS", () => {
        describe("when the auth session succeeds", () => {
            test("opens the auth session and creates a session from the redirect URL", async () => {
                vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: "success", url: REDIRECT_URL });
                const context = renderProvider();
                await waitFor(() => expect(crossmintAuth.getOAuthUrl).toHaveBeenCalledTimes(2));

                await act(() => context.current?.loginWithOAuth("google"));

                const openedUrl = new URL(vi.mocked(WebBrowser.openAuthSessionAsync).mock.calls[0][0]);
                expect(openedUrl.origin + openedUrl.pathname).toBe("https://staging.crossmint.com/oauth/google");
                expect(openedUrl.searchParams.get("provider_prompt")).toBe("select_account");
                expect(crossmintAuth.handleRefreshAuthMaterial).toHaveBeenCalledWith("secret/value");
                expect(WebBrowser.warmUpAsync).toHaveBeenCalled();
                expect(WebBrowser.coolDownAsync).toHaveBeenCalled();
            });
        });

        describe("when the user cancels the auth session", () => {
            test("does not create a session", async () => {
                vi.mocked(WebBrowser.openAuthSessionAsync).mockResolvedValue({ type: "cancel" });
                const context = renderProvider();

                await act(() => context.current?.loginWithOAuth("twitter"));

                expect(crossmintAuth.handleRefreshAuthMaterial).not.toHaveBeenCalled();
                expect(context.current?.status).toBe("logged-out");
            });
        });

        describe("when the auth session throws", () => {
            test("rejects with an OAuth login error", async () => {
                vi.spyOn(console, "error").mockImplementation(() => {});
                vi.mocked(WebBrowser.openAuthSessionAsync).mockRejectedValue(new Error("no presenting window"));
                const context = renderProvider();

                await expect(act(() => context.current?.loginWithOAuth("google"))).rejects.toThrow(
                    "Error during OAuth login"
                );
                expect(context.current?.status).toBe("logged-out");
            });
        });
    });

    describe("loginWithOAuth on Android", () => {
        test("opens the OAuth URL in the browser, and the app completes the session from the redirect URL", async () => {
            platform.OS = "android";
            const context = renderProvider();
            await waitFor(() => expect(crossmintAuth.getOAuthUrl).toHaveBeenCalledTimes(2));

            await act(() => context.current?.loginWithOAuth("google"));

            const openedUrl = new URL(vi.mocked(WebBrowser.openBrowserAsync).mock.calls[0][0]);
            expect(openedUrl.origin + openedUrl.pathname).toBe("https://staging.crossmint.com/oauth/google");
            expect(openedUrl.searchParams.get("provider_prompt")).toBe("select_account");
            expect(WebBrowser.openAuthSessionAsync).not.toHaveBeenCalled();
            expect(crossmintAuth.handleRefreshAuthMaterial).not.toHaveBeenCalled();

            // Android returns to the app through the deep link, which the app hands to createAuthSession.
            await act(() => context.current?.createAuthSession(REDIRECT_URL));

            expect(crossmintAuth.handleRefreshAuthMaterial).toHaveBeenCalledWith("secret/value");
        });
    });

    describe("createAuthSession", () => {
        test("accepts a one-time secret", async () => {
            const context = renderProvider();

            await act(() => context.current?.createAuthSession("raw-secret"));

            expect(crossmintAuth.handleRefreshAuthMaterial).toHaveBeenCalledWith("raw-secret");
        });

        describe("when the URL has no one-time secret", () => {
            test("returns null", async () => {
                const context = renderProvider();

                let result: unknown;
                await act(async () => {
                    result = await context.current?.createAuthSession(`${APP_SCHEMA}://auth?error=denied`);
                });

                expect(result).toBeNull();
                expect(crossmintAuth.handleRefreshAuthMaterial).not.toHaveBeenCalled();
            });
        });
    });
});
