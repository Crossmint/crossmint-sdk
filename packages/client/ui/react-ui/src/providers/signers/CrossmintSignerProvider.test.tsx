import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CrossmintSignerProvider, useCrossmintSigner } from "./CrossmintSignerProvider";
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { useSignerIFrameWindow } from "@/hooks/useSignerInvisibleIFrame";

// Mock ResizeObserver for the iframe stuff
class MockResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

// Add the mock to the global object
global.ResizeObserver = MockResizeObserver;
document.elementFromPoint = vi.fn();

// Mock dependencies
vi.mock("@crossmint/wallets-sdk", () => ({
    CrossmintWallets: {
        from: vi.fn(() => ({
            getOrCreateWallet: vi.fn(),
        })),
    },
}));

vi.mock("@crossmint/client-sdk-window", () => ({
    IFrameWindow: {
        init: vi.fn(),
    },
}));

vi.mock("@/hooks", () => ({
    useCrossmint: vi.fn(() => ({
        crossmint: {
            apiKey: "test-api-key",
            jwt: "test-jwt",
        },
    })),
}));

// Mock the useIFrameWindow hook
vi.mock("@/hooks/useSignerInvisibleIFrame", () => ({
    useSignerIFrameWindow: vi.fn(() => ({
        current: {
            sendAction: vi.fn(),
        },
    })),
}));

// Test component to use the hook
function TestComponent() {
    const { experimental_getOrCreateWalletWithRecoveryKey } = useCrossmintSigner();
    return (
        <button onClick={() => experimental_getOrCreateWalletWithRecoveryKey({ type: "solana" })}>Create Wallet</button>
    );
}

describe("CrossmintSignerProvider", () => {
    const mockSetWalletState = vi.fn();
    const defaultProps = {
        children: <div>Test Children</div>,
        walletState: { status: "not-loaded" },
        setWalletState: mockSetWalletState,
        appearance: {
            colors: {
                accent: "#000000",
                textPrimary: "#000000",
            },
        },
    } as const;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useSignerIFrameWindow).mockImplementation(() => ({
            // @ts-expect-error Mocking the iframe window
            current: {
                sendAction: vi.fn().mockImplementation(({ event }) => {
                    switch (event) {
                        case "request:get-public-key":
                            return Promise.resolve({
                                status: "error", // Default to no existing signer
                                publicKey: null, // Add this even though error
                            });
                        case "request:create-signer":
                            return Promise.resolve({
                                status: "success",
                                address: null,
                                publicKey: "mock-public-key", // Add publicKey
                            });
                        default:
                            return Promise.resolve({
                                status: "success",
                                address: "existing-signer-address",
                                publicKey: "mock-public-key", // Add publicKey
                            });
                    }
                }),
            },
        }));
    });
    it("renders children correctly", () => {
        render(<CrossmintSignerProvider {...defaultProps} />);
        expect(screen.getByText("Test Children")).not.toBeUndefined();
    });

    it("initializes CrossmintWallets with correct parameters", () => {
        render(<CrossmintSignerProvider {...defaultProps} />);
        expect(CrossmintWallets.from).toHaveBeenCalledWith({
            apiKey: "test-api-key",
            jwt: "test-jwt",
        });
    });

    describe("getOrCreateWalletWithNonCustodialSigner", () => {
        it("throws error for unsupported wallet types", async () => {
            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            const button = screen.getByText("Create Wallet");
            await fireEvent.click(button);

            expect(mockSetWalletState).toHaveBeenCalledWith({ status: "in-progress" });
        });

        it("opens dialog when creating wallet", async () => {
            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            const button = screen.getByText("Create Wallet");
            await fireEvent.click(button);

            await waitFor(() => {
                expect(screen.getByText("Create Recovery Key")).not.toBeUndefined();
            });
        });
    });
});
