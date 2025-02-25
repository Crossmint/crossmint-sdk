import { render, fireEvent, waitFor } from "@testing-library/react";
import { beforeEach } from "vitest";
import { AuthFormProvider, useAuthForm } from "./AuthFormProvider";
import { describe, expect, it, vi } from "vitest";
import type { CrossmintAuthWalletConfig, LoginMethod } from "..";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";

vi.mock("@/hooks/useCrossmintAuth");

// Mock component to test the AuthFormProvider
function TestComponent() {
    const { step, baseUrl, loginMethods, setStep, setDialogOpen, oauthUrlMap, isLoadingOauthUrlMap, appearance } =
        useAuthForm();

    return (
        <div>
            <div data-testid="step">{step}</div>
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
    const mockInitialState = {
        baseUrl: "https://api.example.com",
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
    const mockedGetOAuthUrl = vi.fn();

    beforeEach(() => {
        vi.resetAllMocks();

        vi.mocked(useCrossmintAuth).mockReturnValue({
            crossmintAuth: {
                getOAuthUrl: mockedGetOAuthUrl.mockResolvedValue("https://oauth.example.com"),
            },
        } as any);
    });

    it("provides initial context values and fetches OAuth URLs", async () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState} preFetchOAuthUrls={true}>
                <TestComponent />
            </AuthFormProvider>
        );

        expect(getByTestId("step").textContent).toBe("initial");
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

    it("updates step", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState} preFetchOAuthUrls={true}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-step"));
        expect(getByTestId("step").textContent).toBe("otp");
    });

    it("calls setDialogOpen", () => {
        const { getByTestId } = render(
            <AuthFormProvider
                setDialogOpen={mockInitialState.setDialogOpen}
                initialState={mockInitialState}
                preFetchOAuthUrls={true}
            >
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-dialog-open"));
        expect(mockInitialState.setDialogOpen).toHaveBeenCalledWith(true, undefined);
    });

    it("handles OAuth URL fetch error", async () => {
        vi.mocked(mockedGetOAuthUrl).mockRejectedValue(new Error("Fetch failed"));

        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState} preFetchOAuthUrls={true}>
                <TestComponent />
            </AuthFormProvider>
        );

        await waitFor(() => {
            expect(getByTestId("oauth-url").textContent).toBe('{"google":"","twitter":""}');
            expect(getByTestId("is-loading-oauth-url").textContent).toBe("false");
        });
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
                <AuthFormProvider initialState={invalidState} preFetchOAuthUrls={true}>
                    <TestComponent />
                </AuthFormProvider>
            )
        ).toThrowError("Creating wallets on login is not yet supported for web3 login method");
    });
});
