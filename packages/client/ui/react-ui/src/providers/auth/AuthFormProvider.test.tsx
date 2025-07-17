import { render, fireEvent } from "@testing-library/react";
import { beforeEach } from "vitest";
import { AuthFormProvider, useAuthForm } from "./AuthFormProvider";
import { describe, expect, it, vi } from "vitest";
import type { LoginMethod } from "@/types/auth";

// Mock component to test the AuthFormProvider
function TestComponent() {
    const { step, baseUrl, loginMethods, setStep, setDialogOpen, appearance } = useAuthForm();

    return (
        <div>
            <div data-testid="step">{step}</div>
            <div data-testid="base-url">{baseUrl}</div>
            <div data-testid="login-methods">{JSON.stringify(loginMethods)}</div>
            <div data-testid="appearance">{JSON.stringify(appearance)}</div>
            <button onClick={() => setStep("otp")} data-testid="set-step">
                Set Step to OTP
            </button>
            <button onClick={() => setDialogOpen(true)} data-testid="set-dialog-open">
                Open Dialog
            </button>
        </div>
    );
}

describe("AuthFormProvider", () => {
    const mockInitialState = {
        baseUrl: "https://api.example.com",
        loginMethods: ["email", "google", "farcaster", "web3"] as LoginMethod[],
        setDialogOpen: vi.fn(),
        appearance: {
            colors: {
                textPrimary: "#000000",
                textSecondary: "#A4AFB2",
            },
        },
    };

    beforeEach(() => {
        vi.resetAllMocks();
    });

    it("provides initial context values", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        expect(getByTestId("step").textContent).toBe("initial");
        expect(getByTestId("base-url").textContent).toBe("https://api.example.com");
        expect(getByTestId("login-methods").textContent).toBe('["email","google","farcaster","web3"]');
        expect(getByTestId("appearance").textContent).toBe(
            '{"colors":{"textPrimary":"#000000","textSecondary":"#A4AFB2"}}'
        );
    });

    it("updates step", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-step"));
        expect(getByTestId("step").textContent).toBe("otp");
    });

    it("calls setDialogOpen", () => {
        const { getByTestId } = render(
            <AuthFormProvider setDialogOpen={mockInitialState.setDialogOpen} initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-dialog-open"));
        expect(mockInitialState.setDialogOpen).toHaveBeenCalledWith(true, undefined);
    });
});
