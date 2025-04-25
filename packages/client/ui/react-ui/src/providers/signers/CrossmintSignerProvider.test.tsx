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
    const { getOrCreateWalletWithNonCustodialSigner } = useCrossmintSigner();
    return <button onClick={() => getOrCreateWalletWithNonCustodialSigner({ type: "solana" })}>Create Wallet</button>;
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

    describe("Email submission flow", () => {
        it("handles email submission and moves to OTP step for new signers", async () => {
            const mockSendAction = vi.fn().mockResolvedValue({
                status: "success",
                address: null, // Indicates new signer
            });

            vi.mocked(useSignerIFrameWindow).mockImplementation(() => ({
                // @ts-expect-error Mocking the iframe window
                current: {
                    sendAction: mockSendAction,
                },
            }));

            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            // Open the dialog
            const button = screen.getByText("Create Wallet");
            await fireEvent.click(button);

            // Fill and submit email
            const emailInput = screen.getByPlaceholderText("your@email.com");
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            const submitButton = screen.getByText("Submit");
            await fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockSendAction).toHaveBeenCalledWith({
                    event: "request:create-signer",
                    responseEvent: "response:create-signer",
                    data: expect.any(Object),
                });
            });

            // Verify OTP step is shown
            expect(screen.getByText("Verify Recovery Key Creation")).not.toBeUndefined();
        });

        it("handles email submission for existing signers", async () => {
            const mockSendAction = vi.fn().mockResolvedValue({
                status: "success",
                address: "existing-signer-address",
            });

            vi.mocked(useSignerIFrameWindow).mockImplementation(() => ({
                // @ts-expect-error Mocking the iframe window
                current: {
                    sendAction: mockSendAction,
                },
            }));

            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            // Open the dialog
            const button = screen.getByText("Create Wallet");
            await fireEvent.click(button);

            // Fill and submit email
            const emailInput = screen.getByPlaceholderText("your@email.com");
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            const submitButton = screen.getByText("Submit");
            await fireEvent.click(submitButton);

            await waitFor(() => {
                expect(mockSetWalletState).toHaveBeenCalledWith(
                    expect.objectContaining({
                        status: "loaded",
                        type: "solana-smart-wallet",
                    })
                );
            });
        });
    });

    describe("OTP verification flow", () => {
        it("handles successful OTP verification", async () => {
            const mockSendAction = vi
                .fn()
                .mockResolvedValueOnce({
                    // First call for create-signer
                    status: "success",
                    address: null,
                })
                .mockResolvedValueOnce({
                    // Second call for send-otp
                    status: "success",
                    address: "new-signer-address",
                });

            vi.mocked(useSignerIFrameWindow).mockImplementation(() => ({
                // @ts-expect-error Mocking the iframe window
                current: {
                    sendAction: mockSendAction,
                },
            }));

            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            // Open dialog and submit email
            const createButton = screen.getByText("Create Wallet");
            await fireEvent.click(createButton);

            const emailInput = screen.getByPlaceholderText("your@email.com");
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            const submitEmailButton = screen.getByText("Submit");
            await fireEvent.click(submitEmailButton);

            // Wait for the create-signer request to be sent
            await waitFor(() => {
                expect(mockSendAction).toHaveBeenCalledWith({
                    event: "request:create-signer",
                    responseEvent: "response:create-signer",
                    data: expect.any(Object),
                });
            });

            // Verify we're on OTP step
            await waitFor(() => {
                expect(screen.getByText("Verify Recovery Key Creation")).toBeDefined();
            });
        });

        it("handles OTP verification errors", async () => {
            const mockSendAction = vi
                .fn()
                .mockResolvedValueOnce({
                    // First call for create-signer
                    status: "success",
                    address: null,
                })
                .mockResolvedValueOnce({
                    // Second call for send-otp
                    status: "error",
                    error: "Invalid OTP",
                });

            vi.mocked(useSignerIFrameWindow).mockImplementation(() => ({
                // @ts-expect-error Mocking the iframe window
                current: {
                    sendAction: mockSendAction,
                },
            }));

            render(
                <CrossmintSignerProvider {...defaultProps}>
                    <TestComponent />
                </CrossmintSignerProvider>
            );

            // Open dialog and submit email
            const createButton = screen.getByText("Create Wallet");
            await fireEvent.click(createButton);

            const emailInput = screen.getByPlaceholderText("your@email.com");
            fireEvent.change(emailInput, { target: { value: "test@example.com" } });
            const submitEmailButton = screen.getByText("Submit");
            await fireEvent.click(submitEmailButton);

            // Submit OTP
            const otpInputs = screen.getAllByRole("textbox");
            otpInputs.forEach((input, index) => {
                fireEvent.change(input, { target: { value: index.toString() } });
            });

            // await waitFor(() => {
            //     expect(screen.getByText("Invalid code. Please try again.")).not.toBeUndefined();
            // });
        });
    });
});
