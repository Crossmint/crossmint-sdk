import "@testing-library/jest-dom/vitest";

import type { OrderIntentWithVerification } from "@crossmint/client-sdk-base";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { OrderIntentVerification } from "./OrderIntentVerification";

const basisTheory = vi.hoisted(() => ({
    create: vi.fn(),
    verifyAllowance: vi.fn(),
    dispose: vi.fn(),
}));

vi.mock("@basis-theory/web-agentic", () => ({
    AgenticVerification: basisTheory.create,
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

    describe("when the host opens the network page itself", () => {
        const redirectUri = "https://src.mastercard.com/verify?session=abc";

        async function launchedRedirect() {
            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledOnce();
            });
            return basisTheory.create.mock.calls[0][0].openRedirect as ((uri: string) => void) | undefined;
        }

        test("leaves the popup to Basis Theory when openRedirect is not set", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));

            render(<OrderIntentVerification orderIntent={orderIntent("agentpay")} />);

            expect(await launchedRedirect()).toBeUndefined();
        });

        test("hands the redirect URI to openRedirect", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));
            const openRedirect = vi.fn();

            render(<OrderIntentVerification orderIntent={orderIntent("agentpay")} openRedirect={openRedirect} />);
            (await launchedRedirect())?.(redirectUri);

            expect(openRedirect).toHaveBeenCalledWith(redirectUri);
        });

        test("polls for 5 minutes, so the buyer has time for the issuer step and the passkey", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));

            render(<OrderIntentVerification orderIntent={orderIntent("agentpay")} openRedirect={vi.fn()} />);

            await waitFor(() => {
                expect(basisTheory.create).toHaveBeenCalledWith(expect.objectContaining({ completePollAttempts: 25 }));
            });
        });

        test("keeps the running verification and calls the latest openRedirect when the host passes a new one", async () => {
            basisTheory.verifyAllowance.mockReturnValue(new Promise(() => undefined));
            const firstOpenRedirect = vi.fn();
            const latestOpenRedirect = vi.fn();
            const { rerender } = render(
                <OrderIntentVerification orderIntent={orderIntent("agentpay")} openRedirect={firstOpenRedirect} />
            );
            const launch = await launchedRedirect();

            rerender(
                <OrderIntentVerification orderIntent={orderIntent("agentpay")} openRedirect={latestOpenRedirect} />
            );
            launch?.(redirectUri);

            expect(basisTheory.create).toHaveBeenCalledOnce();
            expect(basisTheory.dispose).not.toHaveBeenCalled();
            expect(firstOpenRedirect).not.toHaveBeenCalled();
            expect(latestOpenRedirect).toHaveBeenCalledWith(redirectUri);
        });
    });

    describe("when verification fails", () => {
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
