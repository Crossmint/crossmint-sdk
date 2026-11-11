import "@testing-library/jest-dom/vitest";

import type { OrderIntentWithVerification } from "@crossmint/client-sdk-base";
import { ApiError, PopupBlockedError } from "@basis-theory/web-agentic";
import { SdkLogger } from "@crossmint/common-sdk-base";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { OrderIntentVerification } from "./OrderIntentVerification";
import { LoggerContext } from "../../providers/CrossmintProvider";

const basisTheory = vi.hoisted(() => ({
    create: vi.fn(),
    verifyAllowance: vi.fn(),
    dispose: vi.fn(),
}));

vi.mock("@basis-theory/web-agentic", async (importOriginal) => ({
    ...(await importOriginal<{ default: typeof import("@basis-theory/web-agentic") }>()).default,
    AgenticVerification: basisTheory.create,
}));

vi.mock("../../providers/CrossmintProvider", async () => ({
    LoggerContext: (await import("react")).createContext(null),
}));

function orderIntent(provider: "vic" | "agentpay" = "vic"): OrderIntentWithVerification {
    return {
        orderIntentId: "11792d9b-84d7-4e5e-8f1c-fb933b47a834",
        paymentMethodId: "pm_123",
        status: "active",
        amount: {
            total: "100.00",
            spent: "0.00",
            reserved: "0.00",
            available: "100.00",
            currency: "USD",
        },
        description: "Office supplies",
        rails: [
            {
                rail: "agentic-token",
                provider,
                status: "pending_verification",
                credentialFormats: ["card", "network-token"],
            },
        ],
        verificationConfig: {
            allowanceId: "alw_123",
            environment: "test",
            publicApiKey: "key_test_123",
        },
        expiresAt: "2030-09-01T00:00:00.000Z",
    };
}

describe("<OrderIntentVerification />", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    basisTheory.create.mockImplementation(() => ({
        verifyAllowance: basisTheory.verifyAllowance,
        dispose: basisTheory.dispose,
    }));

    describe("when mounted", () => {
        test.each(["vic", "agentpay"] as const)("verifies the pending %s rail", async (provider) => {
            basisTheory.verifyAllowance.mockResolvedValue({ status: "active", provider, rail: "agentic-token" });
            const onVerificationComplete = vi.fn();

            render(
                <OrderIntentVerification
                    orderIntent={orderIntent(provider)}
                    displayName="Shopping Assistant"
                    onVerificationComplete={onVerificationComplete}
                />
            );

            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledWith({
                    apiKey: "key_test_123",
                    apiBaseUrl: "https://api.test.basistheory.com/agentic",
                    displayName: "Shopping Assistant",
                    appearance: undefined,
                    onEvent: expect.any(Function),
                });
                expect(basisTheory.verifyAllowance).toHaveBeenCalledWith("alw_123", { provider });
                expect(onVerificationComplete).toHaveBeenCalledOnce();
            });
        });

        test("verifies the pending agentic-token rail and ignores spt and encrypted-card", async () => {
            basisTheory.verifyAllowance.mockResolvedValue({ status: "active", provider: "vic", rail: "agentic-token" });

            render(
                <OrderIntentVerification
                    orderIntent={{
                        ...orderIntent("vic"),
                        rails: [
                            {
                                rail: "spt",
                                provider: "stripe",
                                status: "active",
                                credentialFormats: ["identifier"],
                            },
                            {
                                rail: "encrypted-card",
                                status: "active",
                                credentialFormats: ["card"],
                            },
                            {
                                rail: "agentic-token",
                                provider: "vic",
                                status: "pending_verification",
                                credentialFormats: ["card"],
                            },
                        ],
                    }}
                />
            );

            await waitFor(() => {
                expect(basisTheory.verifyAllowance).toHaveBeenCalledWith("alw_123", { provider: "vic" });
            });
            expect(basisTheory.verifyAllowance).toHaveBeenCalledTimes(1);
        });

        test("maps the existing appearance interface", async () => {
            basisTheory.verifyAllowance.mockResolvedValue({ status: "active" });

            render(
                <OrderIntentVerification
                    orderIntent={orderIntent()}
                    appearance={{
                        variables: {
                            colors: {
                                accent: "#111111",
                                backgroundPrimary: "#222222",
                                textPrimary: "#333333",
                            },
                        },
                        rules: {
                            PrimaryButton: {
                                colors: {
                                    text: "#ffffff",
                                },
                            },
                        },
                    }}
                />
            );

            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledWith(
                    expect.objectContaining({
                        appearance: {
                            primaryColor: "#111111",
                            secondaryColor: undefined,
                            backgroundColor: "#222222",
                            fontColor: "#333333",
                            successColor: undefined,
                            errorColor: undefined,
                        },
                    })
                );
            });
        });

        test("does not restart verification when equivalent props are recreated", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));
            const { rerender } = render(
                <OrderIntentVerification
                    orderIntent={orderIntent()}
                    appearance={{ variables: { colors: { accent: "#111111" } } }}
                />
            );

            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledOnce();
            });

            rerender(
                <OrderIntentVerification
                    orderIntent={orderIntent()}
                    appearance={{ variables: { colors: { accent: "#111111" } } }}
                />
            );

            expect(basisTheory.create).toHaveBeenCalledOnce();
            expect(basisTheory.verifyAllowance).toHaveBeenCalledOnce();
            expect(basisTheory.dispose).not.toHaveBeenCalled();
        });
    });

    describe("when verification fails", () => {
        test("omits malformed diagnostic strings instead of copying them into logs", async () => {
            const logger = new SdkLogger();
            const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
            basisTheory.verifyAllowance.mockRejectedValue(
                new ApiError("private", {
                    status: 400,
                    traceId: "https://example.com/?token=secret",
                    problem: { type: "CARD_4242424242424242" },
                })
            );

            render(
                <LoggerContext.Provider value={logger}>
                    <OrderIntentVerification orderIntent={orderIntent()} />
                </LoggerContext.Provider>
            );
            await waitFor(() => expect(warn).toHaveBeenCalledOnce());
            expect(warn.mock.calls[0]?.[1]).toEqual({
                event: "order_intent.verification_failed",
                orderIntentId: orderIntent().orderIntentId,
                allowanceId: "alw_123",
                provider: "vic",
                source: "exception",
                errorType: "api",
                httpStatus: 400,
                code: undefined,
                btTraceId: undefined,
            });
        });

        test("records the recoverable API failure before the user closes the retry dialog, without private data", async () => {
            const logger = new SdkLogger();
            const warn = vi.spyOn(logger, "warn").mockImplementation(() => undefined);
            const onVerificationError = vi.fn();
            const error = new ApiError("private message", {
                status: 422,
                traceId: "bt-trace-123",
                problem: {
                    type: "PROVIDER_ALLOWANCE_FAILED",
                    title: "private title",
                    detail: "card=4242424242424242 cvc=123 otp=654321",
                    debug: { token: "secret-token", providerResponse: "private" },
                    errors: { card: ["private validation response"] },
                },
            });
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));
            basisTheory.create.mockImplementationOnce((options) => {
                options.onEvent?.({ type: "error", error });
                return { verifyAllowance: basisTheory.verifyAllowance, dispose: basisTheory.dispose };
            });

            render(
                <LoggerContext.Provider value={logger}>
                    <OrderIntentVerification orderIntent={orderIntent()} onVerificationError={onVerificationError} />
                </LoggerContext.Provider>
            );

            await waitFor(() => expect(warn).toHaveBeenCalledOnce());
            expect(warn.mock.calls[0]).toEqual([
                "Order intent verification failed",
                {
                    event: "order_intent.verification_failed",
                    orderIntentId: orderIntent().orderIntentId,
                    allowanceId: "alw_123",
                    provider: "vic",
                    source: "event",
                    errorType: "api",
                    httpStatus: 422,
                    code: "PROVIDER_ALLOWANCE_FAILED",
                    btTraceId: "bt-trace-123",
                },
            ]);
            expect(onVerificationError).not.toHaveBeenCalled();
        });

        test("keeps the original popup error and records it once when both the event and promise report it", async () => {
            const logger = new SdkLogger();
            const warn = vi.spyOn(logger, "warn").mockImplementation(() => {
                throw new Error("sink unavailable");
            });
            const onVerificationError = vi.fn();
            const error = new PopupBlockedError("private popup URL");
            basisTheory.create.mockImplementationOnce((options) => {
                options.onEvent?.({ type: "error", error });
                return { verifyAllowance: () => Promise.reject(error), dispose: basisTheory.dispose };
            });

            render(
                <LoggerContext.Provider value={logger}>
                    <OrderIntentVerification orderIntent={orderIntent()} onVerificationError={onVerificationError} />
                </LoggerContext.Provider>
            );

            await waitFor(() => expect(onVerificationError).toHaveBeenCalledWith(error));
            expect(warn).toHaveBeenCalledOnce();
            expect(warn.mock.calls[0]?.[1]).toMatchObject({ errorType: "popup_blocked" });
        });

        test("forwards the error", async () => {
            const error = new Error("Verification failed");
            basisTheory.verifyAllowance.mockRejectedValue(error);
            const onVerificationError = vi.fn();

            render(<OrderIntentVerification orderIntent={orderIntent()} onVerificationError={onVerificationError} />);

            await waitFor(() => {
                expect(onVerificationError).toHaveBeenCalledWith(error);
            });
        });
    });

    describe("when unmounted", () => {
        test("disposes the Basis Theory verifier", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));
            const { unmount } = render(<OrderIntentVerification orderIntent={orderIntent()} />);

            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledOnce();
            });
            unmount();

            expect(basisTheory.dispose).toHaveBeenCalledOnce();
        });
    });
});
