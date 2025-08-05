import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { CrossmintAuthProvider } from "./CrossmintAuthProvider";

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: vi.fn(() => ({
        setJwt: vi.fn(),
    })),
}));

vi.mock("@/hooks", () => ({
    useAuth: vi.fn(() => ({
        user: undefined,
        jwt: undefined,
        experimental_externalWalletSigner: undefined,
    })),
}));

vi.mock("./CrossmintAuthProvider", () => ({
    CrossmintAuthProvider: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="internal-auth-provider">{children}</div>
    ),
}));

describe("CrossmintAuthProvider", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders children correctly", () => {
        render(
            <CrossmintAuthProvider>
                <div data-testid="test-child">Test Child</div>
            </CrossmintAuthProvider>
        );

        expect(screen.getByTestId("test-child")).toBeDefined();
        expect(screen.getByText("Test Child")).toBeDefined();
    });

    it("wraps children with CrossmintAuthProvider", () => {
        render(
            <CrossmintAuthProvider>
                <div data-testid="test-child">Test Child</div>
            </CrossmintAuthProvider>
        );

        expect(screen.getByTestId("internal-auth-provider")).toBeDefined();
        expect(screen.getByTestId("test-child")).toBeDefined();
    });

    it("renders without crashing when no children provided", () => {
        render(<CrossmintAuthProvider>{null}</CrossmintAuthProvider>);

        expect(screen.getByTestId("internal-auth-provider")).toBeDefined();
    });

    it("passes props correctly to provider", () => {
        const testProps = {
            authModalTitle: "Custom Auth Title",
            prefetchOAuthUrls: false,
        };

        render(
            <CrossmintAuthProvider {...testProps}>
                <div>Test</div>
            </CrossmintAuthProvider>
        );
        expect(screen.getByTestId("internal-auth-provider")).toBeDefined();
    });
});
