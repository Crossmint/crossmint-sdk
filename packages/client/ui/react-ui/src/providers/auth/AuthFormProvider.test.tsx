import type { ReactNode } from "react";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { AuthFormProvider, useAuthForm } from "./AuthFormProvider";
import { describe, expect, test, vi, beforeEach } from "vitest";
import type { CrossmintAuthWalletConfig, LoginMethod } from "..";

vi.mock("./web3/WagmiAuthProvider", () => ({
    WagmiAuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

// Mock component to test the AuthFormProvider
function TestComponent() {
    const {
        step,
        apiKey,
        baseUrl,
        loginMethods,
        setStep,
        setDialogOpen,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        appearance,
    } = useAuthForm();

    return (
        <div>
            <div data-testid="step">{step}</div>
            <div data-testid="api-key">{apiKey}</div>
            <div data-testid="base-url">{baseUrl}</div>
            <div data-testid="login-methods">{JSON.stringify(loginMethods)}</div>
            <div data-testid="appearance">{JSON.stringify(appearance)}</div>
            <button onClick={() => setStep("otp")} data-testid="set-step">
                Set Step to OTP
            </button>
            <button onClick={() => setDialogOpen(true)} data-testid="set-dialog-open">
                Open Dialog
            </button>
            <div data-testid="oauth-url">{JSON.stringify(oauthUrlMap)}</div>
            <div data-testid="is-loading-oauth-url">{isLoadingOauthUrlMap.toString()}</div>
        </div>
    );
}

describe("AuthFormProvider", () => {
    const mockFetchAuthMaterial = vi.fn().mockResolvedValue({});
    const mockInitialState = {
        apiKey: "test-api-key",
        baseUrl: "https://api.example.com",
        fetchAuthMaterial: mockFetchAuthMaterial,
        loginMethods: ["email", "google", "farcaster", "web3"] as LoginMethod[],
        setDialogOpen: vi.fn(),
        embeddedWallets: {
            createOnLogin: "off",
            defaultChain: "base-sepolia",
            type: "evm-smart-wallet",
        } as CrossmintAuthWalletConfig,
        appearance: {
            colors: {
                textPrimary: "#000000",
                textSecondary: "#A4AFB2",
            },
        },
    };

    beforeEach(() => {
        vi.resetAllMocks();
        global.fetch = vi.fn().mockImplementation((url: string) => {
            if (url.includes("/auth/social/")) {
                return Promise.resolve({
                    ok: true,
                    json: () =>
                        Promise.resolve({
                            oauthUrl: "https://oauth.example.com",
                        }),
                });
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({}),
            });
        });
    });

    test("provides initial context values and fetches OAuth URLs", async () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        expect(getByTestId("step").textContent).toBe("initial");
        expect(getByTestId("api-key").textContent).toBe("test-api-key");
        expect(getByTestId("base-url").textContent).toBe("https://api.example.com");
        expect(getByTestId("login-methods").textContent).toBe('["email","google","farcaster","web3"]');
        expect(getByTestId("appearance").textContent).toBe(
            '{"colors":{"textPrimary":"#000000","textSecondary":"#A4AFB2"}}'
        );

        await waitFor(() => {
            expect(getByTestId("oauth-url").textContent).toBe('{"google":"https://oauth.example.com"}');
            expect(getByTestId("is-loading-oauth-url").textContent).toBe("false");
        });
    });

    test("updates step", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-step"));
        expect(getByTestId("step").textContent).toBe("otp");
    });

    test("calls setDialogOpen", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-dialog-open"));
        expect(mockInitialState.setDialogOpen).toHaveBeenCalledWith(true);
    });

    test("handles OAuth URL fetch error", async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error("Fetch failed"));
        const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        await waitFor(() => {
            expect(getByTestId("oauth-url").textContent).toBe('{"google":""}');
            expect(getByTestId("is-loading-oauth-url").textContent).toBe("false");
        });

        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });

    test("throws error when web3 login method is used with createOnLogin=all-users", () => {
        const invalidState = {
            ...mockInitialState,
            loginMethods: ["web3"] as LoginMethod[],
            embeddedWallets: {
                createOnLogin: "all-users",
                defaultChain: "base-sepolia",
                type: "evm-smart-wallet",
            } as CrossmintAuthWalletConfig,
        };

        expect(() =>
            render(
                <AuthFormProvider initialState={invalidState}>
                    <TestComponent />
                </AuthFormProvider>
            )
        ).toThrowError("Creating wallets on login is not yet supported for web3 login method");
    });
});
