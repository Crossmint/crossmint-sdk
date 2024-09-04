import { fireEvent, render, waitFor } from "@testing-library/react";
import { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { EVMSmartWallet, SmartWalletError, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";
import { createCrossmint } from "@crossmint/common-sdk-base";

import { CrossmintProvider, useCrossmint } from "../hooks/useCrossmint";
import { useWallet } from "../hooks/useWallet";
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

const MOCK_API_KEY = "sk_development_12341234";

const WALLET_LOADING_TIME = 25;

const checkSettledState = async (callback: () => void) => {
    await new Promise((resolve) => setTimeout(resolve, WALLET_LOADING_TIME * 2));
    callback();
};

function renderWalletProvider({ children }: { children: ReactNode }) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
        </CrossmintProvider>
    );
}

describe("CrossmintWalletProvider", () => {
    let mockSDK: SmartWalletSDK;
    let mockWallet: EVMSmartWallet;

    const TestComponent = () => {
        const { status, wallet, error, getOrCreateWallet, clearWallet } = useWallet();
        const { crossmint } = useCrossmint();

        return (
            <div>
                <div data-testid="error">{error?.message ?? "No Error"}</div>
                <div data-testid="status">{status}</div>
                <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>
                <button
                    data-testid="create-wallet-button"
                    onClick={() =>
                        getOrCreateWallet({ jwt: crossmint.jwt! }, "polygon", {
                            type: "evm-smart-wallet",
                            signer: { type: "PASSKEY" },
                        })
                    }
                >
                    Create Wallet
                </button>
                <button data-testid="clear-wallet-button" onClick={() => clearWallet()}>
                    Clear Wallet
                </button>
            </div>
        );
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock API Key Validation
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            jwt: "mock-jwt",
        }));

        // Mock Wallet SDK
        mockSDK = mock<SmartWalletSDK>();
        mockWallet = mock<EVMSmartWallet>();
        vi.mocked(SmartWalletSDK.init).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockReturnValue(
            new Promise((resolve) => {
                setTimeout(() => resolve(mockWallet), WALLET_LOADING_TIME);
            })
        );
    });

    describe("getOrCreateWallet", () => {
        it("should load the wallet as expected", async () => {
            const { getByTestId } = renderWalletProvider({
                children: <TestComponent />,
            });

            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
            expect(getByTestId("error").textContent).toBe("No Error");

            fireEvent.click(getByTestId("create-wallet-button"));

            await waitFor(() => {
                expect(getByTestId("status").textContent).toBe("in-progress");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");
            });

            await checkSettledState(() => {
                expect(getByTestId("status").textContent).toBe("loaded");
                expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
            });
        });

        describe("When getOrCreateWallet throws a known error", () => {
            beforeEach(() => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(new SmartWalletError("Wallet creation failed"));
            });

            it("should set error directly with the thrown error", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });
            });
        });

        describe("When getOrCreateWallet throws an unknown error", () => {
            beforeEach(() => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(new Error("Wallet creation failed"));
            });

            it("should set the error with the thrown error wrapped with a SmartWalletError", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Unknown Wallet Error: Wallet creation failed");
                });
            });
        });
    });

    test("clearWallet happy path", async () => {
        const { getByTestId } = renderWalletProvider({
            children: <TestComponent />,
        });

        fireEvent.click(getByTestId("create-wallet-button"));

        await checkSettledState(() => {
            expect(getByTestId("status").textContent).toBe("loaded");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
        });

        fireEvent.click(getByTestId("clear-wallet-button"));

        await checkSettledState(() => {
            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
        });
    });
});
