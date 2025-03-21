import { type ReactNode, act } from "react";
import { CrossmintAuth as CrossmintAuthClient, getJWTExpiration, deleteCookie } from "@crossmint/client-sdk-auth";
import { CrossmintWallets, type EVMSignerInput, type EVMSmartWallet } from "@crossmint/wallets-sdk";
import { SESSION_PREFIX, REFRESH_TOKEN_PREFIX } from "@crossmint/common-sdk-auth";
import { createCrossmint } from "@crossmint/common-sdk-base";
import { beforeEach, describe, expect, vi, it, type MockInstance } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { mock } from "vitest-mock-extended";

import { useAuth, useWallet } from "../hooks";
import { CrossmintProvider, useCrossmint } from "../hooks/useCrossmint";
import { MOCK_API_KEY } from "../testUtils";
import { CrossmintAuthProvider } from "./CrossmintAuthProvider";
import type { CrossmintAuthEmbeddedWallets } from "@/types/wallet";

vi.mock("@crossmint/wallets-sdk", async () => {
    const actual = await vi.importActual("@crossmint/wallets-sdk");
    return {
        ...actual,
        CrossmintWallets: {
            from: vi.fn(),
        },
    };
});

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");

    class MockCrossmintApiClient {}

    return {
        ...actual,
        createCrossmint: vi.fn(),
        validateApiKeyAndGetCrossmintBaseUrl: vi.fn(),
        CrossmintApiClient: MockCrossmintApiClient,
    };
});

vi.mock("@crossmint/client-sdk-auth", async () => {
    const actual = await vi.importActual("@crossmint/client-sdk-auth");
    return {
        ...actual,
        getJWTExpiration: vi.fn(),
    };
});

function renderAuthProvider({
    children,
    embeddedWallets,
}: {
    children: ReactNode;
    embeddedWallets: CrossmintAuthEmbeddedWallets;
}) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintAuthProvider embeddedWallets={embeddedWallets}>{children}</CrossmintAuthProvider>
        </CrossmintProvider>
    );
}

function TestComponent() {
    const { setJwt } = useCrossmint();
    const { wallet, type, status: walletStatus, error, clearWallet } = useWallet();
    const { status: authStatus, jwt } = useAuth();
    return (
        <div>
            <div data-testid="error">{error ?? "No Error"}</div>
            <div data-testid="wallet-status">{walletStatus}</div>
            <div data-testid="wallet-type">{type}</div>
            <div data-testid="auth-status">{authStatus}</div>
            <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>
            <div data-testid="auth-jwt">{jwt}</div>
            <button data-testid="auth-jwt-input" onClick={() => setJwt("mock-jwt")}>
                Set JWT
            </button>
            <button data-testid="clear-jwt-button" onClick={() => setJwt(undefined)}>
                Clear JWT
            </button>
            <button data-testid="clear-wallet-button" onClick={clearWallet}>
                Clear Wallet
            </button>
        </div>
    );
}

describe("CrossmintAuthProvider", () => {
    let mockSDK: CrossmintWallets;
    let mockWallet: EVMSmartWallet;
    let embeddedWallets: CrossmintAuthEmbeddedWallets;
    let handleRefreshAuthMaterialSpy: MockInstance;
    let getOAuthUrlSpy: MockInstance;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(
            () =>
                ({
                    apiKey: MOCK_API_KEY,
                }) as any
        );

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

        mockSDK = mock<CrossmintWallets>();
        mockWallet = mock<EVMSmartWallet>();

        vi.mocked(CrossmintWallets.from).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValue(mockWallet);
        vi.mocked(getJWTExpiration).mockReturnValue(1000);
        const mockPasskeySigner = mock<EVMSignerInput>({
            type: "evm-passkey",
            name: "Crossmint Wallet",
        });
        embeddedWallets = {
            defaultChain: "polygon",
            createOnLogin: "all-users",
            type: "evm-smart-wallet",
            showPasskeyHelpers: false,
            adminSigner: mockPasskeySigner,
        };

        deleteCookie(REFRESH_TOKEN_PREFIX);
        deleteCookie(SESSION_PREFIX);

        handleRefreshAuthMaterialSpy = vi.spyOn(CrossmintAuthClient.prototype, "handleRefreshAuthMaterial");
        getOAuthUrlSpy = vi.spyOn(CrossmintAuthClient.prototype, "getOAuthUrl").mockResolvedValue("mock-oauth-url");
        // Casts as any because refreshAuthMaterial is protected
        vi.spyOn(CrossmintAuthClient.prototype as any, "refreshAuthMaterial").mockResolvedValue(
            Promise.resolve({
                jwt: "mock-jwt",
                refreshToken: {
                    secret: "mock-refresh-token",
                    expiresAt: 123456,
                },
                user: {},
            })
        );
        const mockCrossmintAuth = CrossmintAuthClient.from(createCrossmint({ apiKey: MOCK_API_KEY }));
        vi.spyOn(CrossmintAuthClient, "from").mockReturnValue(mockCrossmintAuth);
    });

    it("When user is logged out", async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        expect(getByTestId("auth-status").textContent).toBe("logged-out");
        expect(getByTestId("auth-jwt").textContent).toBe("");
        await waitFor(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
        });

        expect(handleRefreshAuthMaterialSpy).toHaveBeenCalled();
        expect(getOAuthUrlSpy).toHaveBeenCalled();
        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    it("Happy path", async () => {
        await act(() => {
            document.cookie = `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Lax;`;
            document.cookie = `${SESSION_PREFIX}=mock-jwt; path=/; SameSite=Lax;`;
        });

        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        expect(getByTestId("wallet-status").textContent).toBe("in-progress");
        expect(getByTestId("auth-status").textContent).toBe("logged-in");
        expect(getByTestId("wallet").textContent).toBe("No Wallet");
        expect(getByTestId("error").textContent).toBe("No Error");
        expect(getByTestId("wallet-type").textContent).not.toBe("evm-smart-wallet");

        await waitFor(() => {
            expect(getByTestId("wallet-status").textContent).toBe("loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
            expect(getByTestId("error").textContent).toBe("No Error");
            expect(getByTestId("wallet-type").textContent).toBe("evm-smart-wallet");
        });

        expect(handleRefreshAuthMaterialSpy).not.toHaveBeenCalled();
        expect(getOAuthUrlSpy).not.toHaveBeenCalled();
        expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
    });

    it(`When "createOnLogin" is "false", wallet is not loaded`, async () => {
        document.cookie = `${SESSION_PREFIX}=mock-jwt; path=/;SameSite=Lax;`;
        const { getByTestId } = await renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets: {
                defaultChain: "polygon",
                createOnLogin: "off",
                type: "evm-smart-wallet",
            },
        });

        await waitFor(() => {
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
            expect(getByTestId("wallet-status").textContent).toBe("not-loaded");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    it(`When the jwt from crossmint provider is not defined, wallet is not loaded`, async () => {
        const { getByTestId } = await renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitFor(() => {
            expect(getByTestId("wallet-status").textContent).toBe("not-loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    it(`Logging in and asserting the auth status`, async () => {
        const { getByTestId } = await renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitFor(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
        });

        fireEvent.click(getByTestId("auth-jwt-input"));

        await waitFor(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
        });
    });
});
