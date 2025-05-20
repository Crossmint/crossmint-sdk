import React, { type ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import type { GetOrCreateWalletProps } from "@crossmint/client-sdk-react-base";
import { CrossmintWalletProvider, WalletContext } from "../CrossmintWalletProvider";
import { useCrossmint } from "../../hooks";

vi.mock("../../hooks", () => ({
    useCrossmint: vi.fn(),
}));

vi.mock("@crossmint/wallets-sdk", () => ({
    CrossmintWallets: {
        from: vi.fn().mockReturnValue({
            getOrCreateWallet: vi.fn(),
        }),
    },
}));

const MOCK_API_KEY = "mock-api-key";
const MOCK_JWT = "mock-jwt";

// Test component to consume wallet context
function TestComponent() {
    const wallet = React.useContext(WalletContext);
    return (
        <div>
            <div data-testid="status">{wallet.status}</div>
            <div data-testid="wallet">{wallet.status === "loaded" ? "Wallet Loaded" : "No Wallet"}</div>
            <div data-testid="error">{wallet.error ?? "No Error"}</div>
            <div data-testid="wallet-type">{wallet.type ?? "No Type"}</div>
            <button
                data-testid="create-wallet-button"
                onClick={() =>
                    wallet.getOrCreateWallet({
                        type: "evm-smart-wallet",
                        args: { adminSigner: { type: "evm-passkey" } },
                    } as GetOrCreateWalletProps)
                }
            >
                Create Wallet
            </button>
        </div>
    );
}

// Wrapper to provide context
function renderWalletProvider({ children }: { children: ReactNode }) {
    return render(<CrossmintWalletProvider>{children}</CrossmintWalletProvider>);
}

describe("CrossmintWalletProvider", () => {
    let mockSDK: any;
    beforeEach(() => {
        mockSDK = {
            getOrCreateWallet: vi.fn().mockResolvedValue({ address: "mock-address" }),
        };
        vi.mocked(CrossmintWallets.from).mockReturnValue(mockSDK);
        vi.mocked(useCrossmint).mockReturnValue({
            crossmint: {
                apiKey: MOCK_API_KEY,
                jwt: MOCK_JWT,
            },
            setJwt: vi.fn(),
        });
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it("initializes with not-loaded status", () => {
        const { getByTestId } = renderWalletProvider({ children: <TestComponent /> });

        expect(getByTestId("status").textContent).toBe("not-loaded");
        expect(getByTestId("wallet").textContent).toBe("No Wallet");
        expect(getByTestId("error").textContent).toBe("No Error");
    });

    it("creates a wallet when button is clicked", async () => {
        const { getByTestId } = renderWalletProvider({ children: <TestComponent /> });
        fireEvent.click(getByTestId("create-wallet-button"));
        await waitFor(() => {
            expect(getByTestId("status").textContent).toBe("loaded");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
        });

        expect(mockSDK.getOrCreateWallet).toHaveBeenCalledWith(
            "evm-smart-wallet",
            { adminSigner: { type: "evm-passkey" } },
            expect.anything()
        );
    });

    it("does not create a wallet when JWT is missing", async () => {
        vi.mocked(useCrossmint).mockReturnValue({
            crossmint: {
                apiKey: MOCK_API_KEY,
                jwt: undefined,
            },
            setJwt: vi.fn(),
        });

        const { getByTestId } = renderWalletProvider({ children: <TestComponent /> });
        fireEvent.click(getByTestId("create-wallet-button"));
        await waitFor(() => {
            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(mockSDK.getOrCreateWallet).not.toHaveBeenCalled();
        });
    });
});
