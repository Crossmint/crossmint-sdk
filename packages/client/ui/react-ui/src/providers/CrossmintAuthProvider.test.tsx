import { fireEvent, render, waitFor } from "@testing-library/react";
import React, { ReactNode } from "react";
import { beforeEach, describe, expect, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";
import { createCrossmint } from "@crossmint/common-sdk-base";

import { useWallet } from "../hooks";
import { CrossmintProvider, useCrossmint } from "../hooks/useCrossmint";
import { MOCK_API_KEY, waitForSettledState } from "../testUtils";
import { CrossmintAuthProvider, CrossmintAuthWalletConfig } from "./CrossmintAuthProvider";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

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
            <CrossmintWalletProvider>
                <CrossmintAuthProvider embeddedWallets={embeddedWallets}>{children}</CrossmintAuthProvider>
            </CrossmintWalletProvider>
        </CrossmintProvider>
    );
}

function TestComponent() {
    const { setJwt } = useCrossmint();
    const { wallet, status, error } = useWallet();

    return (
        <div>
            <div data-testid="error">{error?.message ?? "No Error"}</div>
            <div data-testid="status">{status}</div>
            <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>
            <input
                data-testid="jwt-input"
                type="text"
                onChange={(e) => {
                    console.log("onChange!");
                    console.log(e.target.value);
                    return setJwt(e.target.value);
                }}
                placeholder="Set JWT"
            />

            <button data-testid="clear-jwt-button" onClick={() => setJwt(undefined)}>
                Clear JWT
            </button>
        </div>
    );
}

describe("CrossmintAuthProvider", () => {
    let mockSDK: SmartWalletSDK;
    let mockWallet: EVMSmartWallet;
    let embeddedWallets: CrossmintAuthWalletConfig;

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            jwt: "mock-jwt",
        }));

        mockSDK = mock<SmartWalletSDK>();
        mockWallet = mock<EVMSmartWallet>();
        vi.mocked(SmartWalletSDK.init).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValue(mockWallet);

        embeddedWallets = {
            defaultChain: "polygon",
            createOnLogin: "all-users",
            type: "evm-smart-wallet",
        };
    });

    test("Happy path", async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitFor(() => {
            expect(getByTestId("status").textContent).toBe("in-progress");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        await waitForSettledState(() => {
            expect(getByTestId("status").textContent).toBe("loaded");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
    });

    test(`When "createOnLogin" is "false", wallet is not loaded`, async () => {
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
            expect(getByTestId("status").textContent).toBe("not-loaded");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    test(`When the jwt from crossmint provider is not defined, wallet is not loaded`, async () => {
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            jwt: undefined,
        }));

        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
    });

    test("When the jwt is cleared, so is the wallet", async () => {
        const { getByTestId } = renderAuthProvider({
            children: <TestComponent />,
            embeddedWallets,
        });

        await waitForSettledState(() => {
            expect(getByTestId("status").textContent).toBe("loaded");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
        });

        fireEvent.click(getByTestId("clear-jwt-button"));

        await waitForSettledState(() => {
            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });

        expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
    });
});
