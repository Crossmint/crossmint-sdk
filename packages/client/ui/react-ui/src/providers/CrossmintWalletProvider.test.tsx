import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: vi.fn(() => ({
        crossmint: undefined,
    })),
    CrossmintWalletBaseProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="wallet-base-provider">{children}</div>
    ),
}));

vi.mock("@/components/auth/PasskeyPrompt", () => ({
    PasskeyPrompt: () => <div data-testid="passkey-prompt">Passkey Prompt</div>,
}));

vi.mock("@/components/signers/EmailSignersDialog", () => ({
    EmailSignersDialog: () => <div data-testid="email-signers-dialog">Email Signers Dialog</div>,
}));

vi.mock("react-dom", () => ({
    createPortal: (element: React.ReactNode) => element,
}));

describe("CrossmintWalletProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders children correctly", () => {
        render(
            <CrossmintWalletProvider>
                <div data-testid="test-child">Test Child</div>
            </CrossmintWalletProvider>
        );

        expect(screen.getByTestId("test-child")).toBeDefined();
        expect(screen.getByText("Test Child")).toBeDefined();
    });

    it("wraps children with CrossmintWalletBaseProvider", () => {
        render(
            <CrossmintWalletProvider>
                <div data-testid="test-child">Test Child</div>
            </CrossmintWalletProvider>
        );

        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
        expect(screen.getByTestId("test-child")).toBeDefined();
    });

    it("renders without crashing when no children provided", () => {
        render(<CrossmintWalletProvider>{null}</CrossmintWalletProvider>);

        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
    });

    it("accepts showPasskeyHelpers prop", () => {
        render(
            <CrossmintWalletProvider showPasskeyHelpers={false}>
                <div>Test</div>
            </CrossmintWalletProvider>
        );

        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
    });

    it("accepts appearance prop", () => {
        const appearance = undefined;

        render(
            <CrossmintWalletProvider appearance={appearance}>
                <div>Test</div>
            </CrossmintWalletProvider>
        );

        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
    });

    it("accepts createOnLogin prop", () => {
        const createOnLogin = undefined;

        render(
            <CrossmintWalletProvider createOnLogin={createOnLogin}>
                <div>Test</div>
            </CrossmintWalletProvider>
        );

        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
    });

    it("accepts callbacks prop", () => {
        const callbacks = {
            onWalletCreationStart: vi.fn(),
            onTransactionStart: vi.fn(),
        };

        render(
            <CrossmintWalletProvider callbacks={callbacks}>
                <div>Test</div>
            </CrossmintWalletProvider>
        );
        expect(screen.getByTestId("wallet-base-provider")).toBeDefined();
    });
});
