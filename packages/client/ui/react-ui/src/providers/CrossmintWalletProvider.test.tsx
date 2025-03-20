import { fireEvent, render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";
import { createCrossmint } from "@crossmint/common-sdk-base";
import { CrossmintWallet, type EVMSmartWallet, type EVMSignerInput } from "@crossmint/wallets-sdk";

import { CrossmintProvider, useCrossmint } from "../hooks/useCrossmint";
import { useWallet } from "../hooks/useWallet";
import { MOCK_API_KEY } from "../testUtils";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

vi.mock("@crossmint/wallets-sdk", async () => {
    const actual = await vi.importActual("@crossmint/wallets-sdk");
    return {
        ...actual,
        CrossmintWallet: {
            from: vi.fn(),
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

vi.mock("../hooks/useCrossmint", async () => {
    const actual = await vi.importActual("../hooks/useCrossmint");
    return {
        ...actual,
        useCrossmint: vi.fn(),
    };
});

function renderWalletProvider({ children }: { children: ReactNode }) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintWalletProvider showPasskeyHelpers={false}>{children}</CrossmintWalletProvider>
        </CrossmintProvider>
    );
}

function TestComponent() {
    const { status, wallet, type, error, getOrCreateWallet, clearWallet } = useWallet();
    const mockPasskeySigner = mock<EVMSignerInput>({
        type: "evm-passkey",
        name: "Crossmint Wallet",
    });

    return (
        <div>
            <div data-testid="error">{error ?? "No Error"}</div>
            <div data-testid="status">{status}</div>
            <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>
            <div data-testid="wallet-type">{type}</div>
            <button
                data-testid="create-wallet-button"
                onClick={() =>
                    getOrCreateWallet({
                        type: "evm-smart-wallet",
                        args: {
                            chain: "polygon-amoy",
                            adminSigner: mockPasskeySigner,
                        },
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
}

describe("CrossmintWalletProvider", () => {
    let mockSDK: CrossmintWallet;
    let mockWallet: EVMSmartWallet;
    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(createCrossmint).mockImplementation(() => ({}) as any);
        vi.mocked(useCrossmint).mockReturnValue({
            crossmint: {
                apiKey: MOCK_API_KEY,
                jwt: "mock-jwt",
            },
            setJwt: () => {},
        });

        mockSDK = mock<CrossmintWallet>();
        mockWallet = mock<EVMSmartWallet>();
        vi.mocked(CrossmintWallet.from).mockReturnValue(mockSDK);
        vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValue(mockWallet);
    });

    describe("getOrCreateWallet", () => {
        it("happy path ", async () => {
            const { getByTestId } = renderWalletProvider({
                children: <TestComponent />,
            });
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
            expect(getByTestId("error").textContent).toBe("No Error");
            expect(getByTestId("wallet-type").textContent).not.toBe("evm-smart-wallet");

            fireEvent.click(getByTestId("create-wallet-button"));

            await waitFor(() => {
                expect(getByTestId("status").textContent).toBe("in-progress");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");
                expect(getByTestId("error").textContent).toBe("No Error");
            });

            await waitFor(() => {
                expect(getByTestId("status").textContent).toBe("loaded");
                expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                expect(getByTestId("error").textContent).toBe("No Error");
                expect(getByTestId("wallet-type").textContent).toBe("evm-smart-wallet");
            });

            expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
        });

        describe(`When jwt is not set in "CrossmintProvider"`, () => {
            beforeEach(() => {
                vi.mocked(useCrossmint).mockReturnValue({
                    crossmint: {
                        apiKey: MOCK_API_KEY,
                        jwt: undefined,
                    },
                    setJwt: () => {},
                });
            });

            it("does not create a wallet", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("not-loaded");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    expect(getByTestId("error").textContent).toBe("No Error");
                });

                expect(vi.mocked(mockSDK.getOrCreateWallet)).not.toHaveBeenCalled();
            });
        });

        describe("When getOrCreateWallet throws a known error", () => {
            beforeEach(() => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue("Wallet creation failed");
            });

            it("should set error directly with the thrown error", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    expect(getByTestId("error").textContent).toBe("No Error");
                });

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });

                expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
            });
        });

        describe("When getOrCreateWallet throws an unknown error", () => {
            beforeEach(() => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue("Wallet creation failed");
            });

            it("should set the error with the thrown error wrapped with a SmartWalletError", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    expect(getByTestId("error").textContent).toBe("No Error");
                });

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });

                expect(vi.mocked(mockSDK.getOrCreateWallet)).toHaveBeenCalledOnce();
            });
        });
    });

    it("clearWallet happy path", async () => {
        const { getByTestId } = renderWalletProvider({
            children: <TestComponent />,
        });

        fireEvent.click(getByTestId("create-wallet-button"));

        await waitFor(() => {
            expect(getByTestId("status").textContent).toBe("loaded");
            expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
            expect(getByTestId("error").textContent).toBe("No Error");
        });

        fireEvent.click(getByTestId("clear-wallet-button"));

        await waitFor(() => {
            expect(getByTestId("status").textContent).toBe("not-loaded");
            expect(getByTestId("wallet").textContent).toBe("No Wallet");
            expect(getByTestId("error").textContent).toBe("No Error");
        });
    });
});
