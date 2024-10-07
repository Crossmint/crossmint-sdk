import { deleteCookie, REFRESH_TOKEN_PREFIX, SESSION_PREFIX } from "@/utils/authCookies";
import { fireEvent, render } from "@testing-library/react";
import { type ReactNode, act } from "react";
import { beforeEach, describe, expect, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { CrossmintAuthService, getJWTExpiration } from "@crossmint/client-sdk-auth-core/client";
import { type EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";
import { createCrossmint } from "@crossmint/common-sdk-base";

import { useAuth, useWallet } from "../hooks";
import { CrossmintProvider, useCrossmint } from "../hooks/useCrossmint";
import { MOCK_API_KEY, waitForSettledState } from "../testUtils";
import { CrossmintAuthProvider, type CrossmintAuthWalletConfig } from "./CrossmintAuthProvider";

vi.mock("@crossmint/client-sdk-smart-wallet", async () => {
    const actual = await vi.importActual("@crossmint/client-sdk-smart-wallet");
    return {
        ...actual,
        SmartWalletSDK: {
            init: vi.fn(),
        },
    };
});

vi.mock("@crossmint/common-sdk-base", async () => {
    const actual = await vi.importActual("@crossmint/common-sdk-base");
    return {
        ...actual,
        createCrossmint: vi.fn(),
        validateApiKeyAndGetCrossmintBaseUrl: vi.fn(),
    };
});

vi.mock("@crossmint/client-sdk-auth-core/client", async () => {
    const actual = await vi.importActual("@crossmint/client-sdk-auth-core/client");
    return {
        ...actual,
        getJWTExpiration: vi.fn(),
        CrossmintAuthService: vi.fn().mockImplementation(() => ({
            refreshAuthMaterial: vi.fn().mockResolvedValue({
                jwtToken: "new-mock-jwt",
                refreshToken: {
                    secret: "new-mock-refresh-token",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
                },
                user: {
                    id: "123",
                    email: "test@test.com",
                },
            }),
        })),
    };
});

function renderAuthProvider({
    children,
    embeddedWallets,
}: {
    children: ReactNode;
    embeddedWallets: CrossmintAuthWalletConfig;
}) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintAuthProvider embeddedWallets={embeddedWallets}>{children}</CrossmintAuthProvider>
        </CrossmintProvider>
    );
}

function TestComponent() {
    const { setJwt, setRefreshToken } = useCrossmint();
    const { wallet, status: walletStatus, error } = useWallet();
    const { status: authStatus, refreshToken } = useAuth();
    return (
        <div>
            <div data-testid="error">{error?.message ?? "No Error"}</div>
            <div data-testid="wallet-status">{walletStatus}</div>
            <div data-testid="auth-status">{authStatus}</div>
            <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>

            <button data-testid="jwt-input" onClick={() => setJwt("mock-jwt")}>
                Set JWT
            </button>
            <button data-testid="clear-jwt-button" onClick={() => setJwt(undefined)}>
                Clear JWT
            </button>

            <div data-testid="refresh-token">{refreshToken ?? "No Refresh Token"}</div>
            <button data-testid="set-refresh-token" onClick={() => setRefreshToken("mock-refresh-token")}>
                Set Refresh Token
            </button>
            <button data-testid="clear-refresh-token-button" onClick={() => setRefreshToken(undefined)}>
                Clear Refresh Token
            </button>
        </div>
    );
}

describe("CrossmintAuthProvider", () => {
    let mockSDK: SmartWalletSDK;
    let mockWallet: EVMSmartWallet;
    let embeddedWallets: CrossmintAuthWalletConfig;
    let mockCrossmintAuthService: { refreshAuthMaterial: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(() => ({}) as any);

        mockSDK = mock<SmartWalletSDK>();
        mockWallet = mock<EVMSmartWallet>();
        vi.mocked(SmartWalletSDK.init).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValue(mockWallet);
        vi.mocked(getJWTExpiration).mockReturnValue(1000);

        embeddedWallets = {
            defaultChain: "polygon",
            createOnLogin: "all-users",
            type: "evm-smart-wallet",
        };

        deleteCookie(REFRESH_TOKEN_PREFIX);
        deleteCookie(SESSION_PREFIX);

        mockCrossmintAuthService = {
            refreshAuthMaterial: vi.fn().mockResolvedValue({
                jwtToken: "new-mock-jwt",
                refreshToken: {
                    secret: "new-mock-refresh-token",
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
                },
            }),
        };
        vi.mocked(CrossmintAuthService).mockImplementation(() => mockCrossmintAuthService as any);
    });

    test("Happy path", async () => {
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
        expect(getByTestId("refresh-token").textContent).toBe("No Refresh Token");
        expect(getByTestId("wallet").textContent).toBe("No Wallet");
        expect(getByTestId("error").textContent).toBe("No Error");

        await waitForSettledState(() => {
            expect(getByTestId("wallet-status").textContent).toBe("loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
            expect(getByTestId("refresh-token").textContent).toBe("new-mock-refresh-token");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
            expect(getByTestId("error").textContent).toBe("No Error");
        });

        expect(mockCrossmintAuthService.refreshAuthMaterial).toHaveBeenCalledOnce();
        expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
    });

    test(`When "createOnLogin" is "false", wallet is not loaded`, async () => {
        document.cookie = `${SESSION_PREFIX}=mock-jwt; path=/;SameSite=Lax;`;
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets: {
                defaultChain: "polygon",
                createOnLogin: "off",
                type: "evm-smart-wallet",
            },
        });

        await waitForSettledState(() => {
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
            expect(getByTestId("wallet-status").textContent).toBe("not-loaded");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    test(`When the jwt from crossmint provider is not defined, wallet is not loaded`, async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("wallet-status").textContent).toBe("not-loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    test("When the jwt is cleared, so is the wallet", async () => {
        document.cookie = `${SESSION_PREFIX}=mock-jwt; path=/;SameSite=Lax;`;
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("wallet-status").textContent).toBe("loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
        });

        fireEvent.click(getByTestId("clear-jwt-button"));

        await waitForSettledState(() => {
            expect(getByTestId("wallet-status").textContent).toBe("not-loaded");
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
    });

    test(`Logging in and asserting the auth status`, async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
        });

        fireEvent.click(getByTestId("jwt-input"));

        await waitForSettledState(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
        });
    });

    test("Setting and clearing refresh token", async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        expect(getByTestId("refresh-token").textContent).toBe("No Refresh Token");

        fireEvent.click(getByTestId("set-refresh-token"));

        await waitForSettledState(() => {
            expect(getByTestId("refresh-token").textContent).toBe("mock-refresh-token");
        });

        fireEvent.click(getByTestId("clear-refresh-token-button"));

        await waitForSettledState(() => {
            expect(getByTestId("refresh-token").textContent).toBe("No Refresh Token");
        });
    });

    test("Logout clears both JWT and refresh token", async () => {
        await act(() => {
            document.cookie = `${REFRESH_TOKEN_PREFIX}=mock-refresh-token; path=/; SameSite=Lax;`;
            document.cookie = `${SESSION_PREFIX}=mock-jwt; path=/; SameSite=Lax;`;
        });

        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-in");
            expect(getByTestId("refresh-token").textContent).toBe("new-mock-refresh-token");
        });

        await act(() => {
            fireEvent.click(getByTestId("clear-jwt-button"));
            fireEvent.click(getByTestId("clear-refresh-token-button"));
        });

        await waitForSettledState(() => {
            expect(getByTestId("auth-status").textContent).toBe("logged-out");
            expect(getByTestId("refresh-token").textContent).toBe("No Refresh Token");
        });
    });
});
