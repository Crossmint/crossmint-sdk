import { render, fireEvent } from "@testing-library/react";
import { AuthFormProvider, useAuthForm } from "./AuthFormProvider";
import { describe, expect, test, vi } from "vitest";
import type { LoginMethod } from "..";

// Mock component to test the AuthFormProvider
function TestComponent() {
    const { step, apiKey, baseUrl, loginMethods, setStep, setDialogOpen } = useAuthForm();

    return (
        <div>
            <div data-testid="step">{step}</div>
            <div data-testid="api-key">{apiKey}</div>
            <div data-testid="base-url">{baseUrl}</div>
            <div data-testid="login-methods">{JSON.stringify(loginMethods)}</div>
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
    const mockFetchAuthMaterial = vi.fn().mockResolvedValue({});
    const mockInitialState = {
        apiKey: "test-api-key",
        baseUrl: "https://api.example.com",
        fetchAuthMaterial: mockFetchAuthMaterial,
        loginMethods: ["email", "google"] as LoginMethod[],
        setDialogOpen: vi.fn(),
    };

    test("provides initial context values", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        expect(getByTestId("step").textContent).toBe("initial");
        expect(getByTestId("api-key").textContent).toBe("test-api-key");
        expect(getByTestId("base-url").textContent).toBe("https://api.example.com");
        expect(getByTestId("login-methods").textContent).toBe('["email","google"]');
    });

    test("updates step", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-step"));
        expect(getByTestId("step").textContent).toBe("otp");
    });

    test("calls setDialogOpen", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-dialog-open"));
        expect(mockInitialState.setDialogOpen).toHaveBeenCalledWith(true);
    });
});
