import { RenderResult, fireEvent, render, waitFor } from "@testing-library/react";
import { ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mock } from "vitest-mock-extended";

import { EVMSmartWallet, SmartWalletError, SmartWalletSDK, WalletParams } from "@crossmint/client-sdk-smart-wallet";
import { createCrossmint } from "@crossmint/common-sdk-base";

import { CrossmintProvider } from "../hooks/useCrossmint";
import { useWallet } from "../hooks/useWallet";
import { CrossmintWalletProvider, ManualCreationResult } from "./CrossmintWalletProvider";

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

const MOCK_API_KEY =
    "sk_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuSvnKeGiqY654DoBuuZEzYz4Eb8gRV2ePqQ1fxTjEP8tTaUQdzbGfyG9RgyeN5YbqViXinqxk8EayEkAGtvSSgjpjEr6iaBptJtUFwPW59DjQzTQP6P8uZdiajenVg7bARGKjzFyByNuVEoz41DpRB4hDZNFdwCTuf5joFv";

const WALLET_LOADING_TIME = 25;

const checkSettledState = async (callback: () => void) => {
    await new Promise((resolve) => setTimeout(resolve, WALLET_LOADING_TIME * 2));
    callback();
};

function renderWalletProvider({
    children,
    createOnInit,
    walletConfig,
}: {
    children: ReactNode;
    createOnInit: boolean;
    walletConfig?: WalletParams & { type: "evm-smart-wallet" };
}) {
    return render(
        <CrossmintProvider apiKey={MOCK_API_KEY}>
            <CrossmintWalletProvider
                defaultChain="polygon-amoy"
                createOnInit={createOnInit}
                walletConfig={walletConfig}
            >
                {children}
            </CrossmintWalletProvider>
        </CrossmintProvider>
    );
}

describe("CrossmintWalletProvider", () => {
    let mockSDK: SmartWalletSDK;
    let mockWallet: EVMSmartWallet;
    let createOnInit: boolean;
    let walletConfig: (WalletParams & { type: "evm-smart-wallet" }) | undefined;
    let renderResult: RenderResult;

    const TestComponent = () => {
        const { status, wallet, error, getOrCreateWallet } = useWallet();
        const [result, setResult] = useState<ManualCreationResult | null>(null);
        return (
            <div>
                <div data-testid="error">{error?.message ?? "No Error"}</div>
                <div data-testid="status">{status}</div>
                <div data-testid="wallet">{wallet ? "Wallet Loaded" : "No Wallet"}</div>
                <button data-testid="create-wallet-button" onClick={() => setResult(getOrCreateWallet())}>
                    Create Wallet
                </button>
                <div data-testid="create-wallet-button-result">{JSON.stringify(result)}</div>
            </div>
        );
    };

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock API Key Validation
        vi.mocked(createCrossmint).mockImplementation(() => ({
            apiKey: MOCK_API_KEY,
            jwt: "",
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

    describe(`When createOnInit is "true"`, () => {
        beforeEach(() => {
            createOnInit = true;
            walletConfig = { type: "evm-smart-wallet", signer: { type: "PASSKEY" } };
        });

        describe("Happy path", () => {
            it("After, the wallet loads in", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit,
                    walletConfig,
                });

                // initial state
                expect(getByTestId("status").textContent).toBe("in-progress");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");

                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loaded");
                    expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                });
            });
        });

        describe("Error handling", async () => {
            describe("When getOrCreateWallet throws an unknown error", async () => {
                beforeEach(() => {
                    vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(new Error("Wallet creation failed"));
                });

                it("populates the useWallet hook error state letting the developer know it's an unknown error", async () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

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

            describe("when getOrCreateWallet throws a known error", async () => {
                beforeEach(() => {
                    vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValueOnce(
                        new SmartWalletError("Wallet creation failed")
                    );
                });

                it("populates the useWallet hook error state with the expected error message", async () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

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

            test("If the automated wallet creation fails, a dev can recover by calling getOrCreateWallet", async () => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValueOnce(
                    new SmartWalletError("Wallet creation failed")
                );

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit,
                    walletConfig,
                });

                // initial state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });

                vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValueOnce(mockWallet);
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
        });

        describe("Cases where wallet creation is not ready", () => {
            describe("When wallet config is not defined", async () => {
                beforeEach(() => {
                    walletConfig = undefined;
                });

                it("doesn't make wallet", async () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

                    await checkSettledState(() => {
                        expect(getByTestId("status").textContent).toBe("not-loaded");
                        expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    });
                });
            });

            describe("When the jwt from CrossmintProvider is not defined", async () => {
                beforeEach(() => {
                    walletConfig = undefined;
                    vi.mocked(createCrossmint).mockImplementation(() => ({
                        apiKey: MOCK_API_KEY,
                        jwt: undefined,
                    }));
                });

                it("doesn't make a wallet", async () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

                    await checkSettledState(() => {
                        expect(getByTestId("status").textContent).toBe("not-loaded");
                        expect(getByTestId("wallet").textContent).toBe("No Wallet");
                    });
                });
            });
        });
    });

    describe(`When createOnInit is "false"`, async () => {
        beforeEach(() => {
            createOnInit = false;
            walletConfig = { type: "evm-smart-wallet", signer: { type: "PASSKEY" } };
        });

        describe("Happy path", () => {
            test("The wallet loads as expected", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit,
                    walletConfig,
                });

                expect(getByTestId("status").textContent).toBe("not-loaded");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");
                expect(getByTestId("error").textContent).toBe("No Error");

                fireEvent.click(getByTestId("create-wallet-button"));

                expect(JSON.parse(getByTestId("create-wallet-button-result").textContent!)).toEqual({
                    initiatedCreation: true,
                });

                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loaded");
                    expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                });
            });

            describe("When getOrCreateWallet throws an error", async () => {
                beforeEach(() => {
                    vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(
                        new SmartWalletError("Wallet creation failed")
                    );
                });

                it("Populates the useWallet hook error state with the error", async () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
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
        });

        describe("Cases where wallet creation is not ready", () => {
            describe("When wallet config is not defined", () => {
                beforeEach(() => {
                    walletConfig = undefined;
                });

                it("getOrCreateWallet does not instantiate wallet creation", () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

                    fireEvent.click(getByTestId("create-wallet-button"));

                    const result = JSON.parse(getByTestId("create-wallet-button-result").textContent!);
                    expect(result).toEqual({
                        initiatedCreation: false,
                        reason: "No wallet config provided, not creating wallet.",
                    });
                });
            });

            describe("When the jwt from CrossmintProvider is not defined", () => {
                beforeEach(() => {
                    vi.mocked(createCrossmint).mockImplementation(() => ({
                        apiKey: MOCK_API_KEY,
                        jwt: undefined,
                    }));
                });

                it("getOrCreateWallet does not instantiate wallet creation", () => {
                    const { getByTestId } = renderWalletProvider({
                        children: <TestComponent />,
                        createOnInit,
                        walletConfig,
                    });

                    fireEvent.click(getByTestId("create-wallet-button"));

                    const result = JSON.parse(getByTestId("create-wallet-button-result").textContent!);
                    expect(result).toEqual({
                        initiatedCreation: false,
                        reason: "No authenticated user, not creating wallet.",
                    });
                });
            });

            test("When the wallet is already loaded or loading, calling getOrCreateWallet from useWallet does not instantiate wallet creation", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: false,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                fireEvent.click(getByTestId("create-wallet-button"));
                await checkSettledState(() => {});

                fireEvent.click(getByTestId("create-wallet-button"));
                const result = JSON.parse(getByTestId("create-wallet-button-result").textContent!);
                expect(result).toEqual({
                    initiatedCreation: false,
                    reason: "Wallet is already loaded, or is currently loading.",
                });
            });
        });
    });
});
