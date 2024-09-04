import { fireEvent, getByText, render, waitFor } from "@testing-library/react";
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
        describe("Happy path", () => {
            it("After, the wallet loads in", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                // initial state
                expect(getByTestId("status").textContent).toBe("in-progress");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loaded");
                    expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                });
            });
        });

        describe("Error handling", async () => {
            it("handles unknown errors", async () => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(new Error("Wallet creation failed"));

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                // loading state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Unknown Wallet Error: Wallet creation failed");
                });
            });

            it("handles smart wallet errors", async () => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValueOnce(
                    new SmartWalletError("Wallet creation failed")
                );

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                // loading state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });
            });

            it("If the automated wallet creation fails, a dev can recover by calling getOrCreateWallet", async () => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValueOnce(
                    new SmartWalletError("Wallet creation failed")
                );

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                // initial state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final failure state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });

                vi.mocked(mockSDK.getOrCreateWallet).mockResolvedValueOnce(mockWallet);
                fireEvent.click(getByTestId("create-wallet-button"));

                // loading state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loaded");
                    expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                });
            });
        });

        describe("Cases where wallet creation is not ready", () => {
            it("When wallet config is not defined or null", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: undefined,
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("not-loaded");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });
            });

            it("When the jwt from CrossmintProvider is not defined", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: true,
                    walletConfig: undefined,
                });

                vi.mocked(createCrossmint).mockImplementation(() => ({
                    apiKey: MOCK_API_KEY,
                    jwt: undefined,
                }));

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("not-loaded");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });
            });
        });
    });

    describe(`When createOnInit is "false"`, async () => {
        describe("Happy path", () => {
            it("After, the wallet loads in", async () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: false,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                // initial state
                expect(getByTestId("status").textContent).toBe("not-loaded");
                expect(getByTestId("wallet").textContent).toBe("No Wallet");
                expect(getByTestId("error").textContent).toBe("No Error");

                fireEvent.click(getByTestId("create-wallet-button"));

                expect(JSON.parse(getByTestId("create-wallet-button-result").textContent!)).toEqual({
                    initiatedCreation: true,
                });

                // loading state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loaded");
                    expect(getByTestId("wallet").textContent).toBe("Wallet Loaded");
                });
            });

            it("handles smart wallet errors", async () => {
                vi.mocked(mockSDK.getOrCreateWallet).mockRejectedValue(new SmartWalletError("Wallet creation failed"));

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: false,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                // loading state
                await waitFor(() => {
                    expect(getByTestId("status").textContent).toBe("in-progress");
                    expect(getByTestId("wallet").textContent).toBe("No Wallet");
                });

                // final state
                await checkSettledState(() => {
                    expect(getByTestId("status").textContent).toBe("loading-error");
                    expect(getByTestId("error").textContent).toBe("Wallet creation failed");
                });
            });
        });

        describe("Cases where wallet creation is not ready", () => {
            it("When wallet config is not defined, getOrCreateWallet returns appropriate result", () => {
                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: false,
                    walletConfig: undefined,
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                const result = JSON.parse(getByTestId("create-wallet-button-result").textContent!);
                expect(result).toEqual({
                    initiatedCreation: false,
                    reason: "No wallet config provided, not creating wallet.",
                });
            });

            it("When the jwt from CrossmintProvider is not defined, getOrCreateWallet returns appropriate result", () => {
                vi.mocked(createCrossmint).mockImplementation(() => ({
                    apiKey: MOCK_API_KEY,
                    jwt: undefined,
                }));

                const { getByTestId } = renderWalletProvider({
                    children: <TestComponent />,
                    createOnInit: false,
                    walletConfig: { type: "evm-smart-wallet", signer: { type: "PASSKEY" } },
                });

                fireEvent.click(getByTestId("create-wallet-button"));

                const result = JSON.parse(getByTestId("create-wallet-button-result").textContent!);
                expect(result).toEqual({
                    initiatedCreation: false,
                    reason: "No authenticated user, not creating wallet.",
                });
            });

            it("should not initiate wallet creation when wallet is already loaded or loading", async () => {
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
