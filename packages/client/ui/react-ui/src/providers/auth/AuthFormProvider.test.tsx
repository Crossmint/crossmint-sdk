import { render, fireEvent } from "@testing-library/react";
import { AuthFormProvider, useAuthForm } from "./AuthFormProvider";
import { describe, expect, test, vi } from "vitest";
import type { LoginMethod } from "..";

// Mock component to test the AuthFormProvider
function TestComponent() {
    const {
        step,
        email,
        apiKey,
        baseUrl,
        otpEmailData,
        loginMethods,
        setStep,
        setEmail,
        setDialogOpen,
        setOtpEmailData,
        resetState,
    } = useAuthForm();

    return (
        <div>
            <div data-testid="step">{step}</div>
            <div data-testid="email">{email}</div>
            <div data-testid="api-key">{apiKey}</div>
            <div data-testid="base-url">{baseUrl}</div>
            <div data-testid="otp-email-data">{JSON.stringify(otpEmailData)}</div>
            <div data-testid="login-methods">{JSON.stringify(loginMethods)}</div>
            <button onClick={() => setStep("otp")} data-testid="set-step">
                Set Step to OTP
            </button>
            <button onClick={() => setEmail("test@example.com")} data-testid="set-email">
                Set Email
            </button>
            <button onClick={() => setDialogOpen(true)} data-testid="set-dialog-open">
                Open Dialog
            </button>
            <button
                onClick={() => setOtpEmailData({ email: "test@example.com", state: "test-state" })}
                data-testid="set-otp-email-data"
            >
                Set OTP Email Data
            </button>
            <button onClick={resetState} data-testid="reset-state">
                Reset State
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
        expect(getByTestId("email").textContent).toBe("");
        expect(getByTestId("api-key").textContent).toBe("test-api-key");
        expect(getByTestId("base-url").textContent).toBe("https://api.example.com");
        expect(getByTestId("otp-email-data").textContent).toBe("null");
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

    test("updates email", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-email"));
        expect(getByTestId("email").textContent).toBe("test@example.com");
    });

    test("sets OTP email data", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        fireEvent.click(getByTestId("set-otp-email-data"));
        expect(getByTestId("otp-email-data").textContent).toBe('{"email":"test@example.com","state":"test-state"}');
    });

    test("resets state", () => {
        const { getByTestId } = render(
            <AuthFormProvider initialState={mockInitialState}>
                <TestComponent />
            </AuthFormProvider>
        );

        // Set some values
        fireEvent.click(getByTestId("set-step"));
        fireEvent.click(getByTestId("set-email"));

        // Reset state
        fireEvent.click(getByTestId("reset-state"));

        // Check if values are reset
        expect(getByTestId("step").textContent).toBe("initial");
        expect(getByTestId("email").textContent).toBe("");
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
