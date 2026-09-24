import "@testing-library/jest-dom/vitest";

import { ApiClient } from "@crossmint/common-sdk-base";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useEffect, useRef } from "react";

import { CrossmintAgentCardAuthorization } from "./CrossmintAgentCardAuthorization";
import { MISSING_JWT_GRACE_MS, RAIL_POLL_INTERVAL_MS, RAIL_POLL_TIMEOUT_MS } from "./useAgentCardAuthorization";

// Handles the child-component stubs write their latest props into, so tests can fire callbacks.
const stubs = vi.hoisted(() => ({
    pmm: { props: null as null | Record<string, (value: unknown) => void> },
    verification: { props: null as null | Record<string, (value?: unknown) => void> },
    cvc: { props: null as null | Record<string, (value?: unknown) => void> },
    crossmint: { crossmint: { apiKey: "ck_staging_key", jwt: "jwt-1" as string | undefined } },
}));

// Like the real iframe wrapper, the stub keeps the props of its first render for the
// callbacks (it subscribes once), so a stale closure in the hook would surface here. The
// rendered jwt attribute follows the live prop, like the real iframe src would.
vi.mock("../card-management", () => ({
    CrossmintPaymentMethodManagement: (props: Record<string, unknown>) => {
        const firstProps = useRef(props);
        useEffect(() => {
            stubs.pmm.props = firstProps.current as Record<string, (value: unknown) => void>;
        }, []);
        return <div data-testid="pmm" data-jwt={String(props.jwt)} />;
    },
}));

vi.mock("../order-intent", () => ({
    OrderIntentVerification: (props: Record<string, (value?: unknown) => void>) => {
        stubs.verification.props = props;
        return <div data-testid="verification" />;
    },
    CrossmintCvcRecollection: (props: Record<string, (value?: unknown) => void>) => {
        stubs.cvc.props = props;
        return <div data-testid="cvc" data-jwt={String(props.jwt)} />;
    },
}));

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => stubs.crossmint,
}));

// A real ApiClient, so requests go through the shared fetch wrapper and only fetch is mocked.
class TestApiClient extends ApiClient {
    get commonHeaders() {
        return { "x-api-key": "ck_staging_key", Authorization: "Bearer jwt-1" };
    }
    get baseUrl() {
        return "https://staging.crossmint.com";
    }
}

// The factory only builds the arrow function; TestApiClient is read when the component renders,
// after this module's body has run, so the hoisted mock never touches it early.
vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => new TestApiClient(),
}));

const fetchMock = vi.fn<typeof fetch>();

function json(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function requests() {
    return fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${new URL(String(url)).pathname}`);
}

function requestBody(index: number) {
    return JSON.parse(String(fetchMock.mock.calls[index]?.[1]?.body));
}

const CARD = {
    type: "card",
    paymentMethodId: "pm_1",
    card: {
        source: { type: "basis-theory-token", id: "bt_token_secret" },
        brand: "visa",
        last4: "4242",
        expiration: { month: "12", year: "2030" },
    },
};

const REGISTERED = { paymentMethodId: "pm_1", rails: [{ rail: "agentic-token", provider: "vic", status: "enabled" }] };

const VIC_ACTIVE = { rail: "agentic-token", provider: "vic", status: "active", credentialFormats: ["card"] };
const VIC_PENDING = { ...VIC_ACTIVE, status: "pending_verification" };
const AGENTPAY_ACTIVE = { rail: "agentic-token", provider: "agentpay", status: "active", credentialFormats: ["card"] };
const SPT_ACTIVE = { rail: "spt", provider: "stripe", status: "active", credentialFormats: ["identifier"] };
const ENCRYPTED_PENDING_CVC = {
    rail: "encrypted-card",
    status: "pending_cvc_recollection",
    credentialFormats: ["card"],
};
const VERIFICATION_CONFIG = { environment: "test", publicApiKey: "key_test_1", allowanceId: "alw_1" };

function orderIntent(rails: unknown[], overrides: Record<string, unknown> = {}) {
    return {
        orderIntentId: "oi_1",
        paymentMethodId: "pm_1",
        status: "active",
        amount: { total: "25.00", spent: "0.00", reserved: "0.00", available: "25.00", currency: "USD" },
        description: "Sneakers",
        rails,
        expiresAt: "2099-01-01T00:00:00.000Z",
        ...overrides,
    };
}

const PROPS = {
    amount: { value: "25.00", currency: "USD" },
    merchant: { name: "Example Shop", url: "https://shop.example.com", countryCode: "US" },
    description: "Sneakers",
    displayName: "Example Shop",
};

function selectCard(paymentMethod: unknown = CARD) {
    const onSelected = stubs.pmm.props?.onPaymentMethodSelected;
    if (onSelected == null) {
        throw new Error("payment method management is not rendered");
    }
    act(() => onSelected(paymentMethod));
}

function renderComponent() {
    const onAuthorized = vi.fn();
    const onError = vi.fn();
    const view = render(<CrossmintAgentCardAuthorization {...PROPS} onAuthorized={onAuthorized} onError={onError} />);
    return { ...view, onAuthorized, onError };
}

describe("<CrossmintAgentCardAuthorization />", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        vi.unstubAllGlobals();
        fetchMock.mockReset();
        stubs.pmm.props = null;
        stubs.verification.props = null;
        stubs.cvc.props = null;
        stubs.crossmint.crossmint.jwt = "jwt-1";
    });

    describe("when the selected card is registered and its vic rail is active", () => {
        test("creates the order intent without re-registering and reports it once", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(requests()).toEqual([
                "GET /api/unstable/payment-methods/pm_1/order-intent-registration",
                "POST /api/unstable/order-intents",
            ]);
            expect(onAuthorized).toHaveBeenCalledWith({
                orderIntentId: "oi_1",
                paymentMethod: { id: "pm_1", type: "card", brand: "visa", last4: "4242" },
                rail: { rail: "agentic-token", provider: "vic" },
                amount: { total: "25.00", spent: "0.00", reserved: "0.00", available: "25.00", currency: "USD" },
                expiresAt: "2099-01-01T00:00:00.000Z",
            });
            expect(onError).not.toHaveBeenCalled();
        });

        test("never lets card.source or the vault token id reach the callbacks", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE])));
            const { onAuthorized } = renderComponent();

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalled());
            const serialized = JSON.stringify(onAuthorized.mock.calls);
            expect(serialized).not.toContain("source");
            expect(serialized).not.toContain("bt_token_secret");
        });

        test("renders only the payment-method UI, restricted to cards, before selection", () => {
            renderComponent();

            expect(screen.getByTestId("pmm")).toBeInTheDocument();
            expect(stubs.pmm.props).toMatchObject({
                jwt: "jwt-1",
                allowedPaymentMethodTypes: ["card"],
                allowedModes: ["existing", "new"],
            });
        });
    });

    describe("when the card has no order-intent registration yet", () => {
        test("registers it, then creates the order intent with the props and a default 24h expiry", async () => {
            const mountedAt = Date.now();
            fetchMock
                .mockResolvedValueOnce(json(404, { message: "not found" }))
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE])));
            const { onAuthorized } = renderComponent();

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalled());
            expect(requests()).toEqual([
                "GET /api/unstable/payment-methods/pm_1/order-intent-registration",
                "PUT /api/unstable/payment-methods/pm_1/order-intent-registration",
                "POST /api/unstable/order-intents",
            ]);
            const body = requestBody(2);
            expect(body).toEqual({
                paymentMethodId: "pm_1",
                amount: PROPS.amount,
                merchant: PROPS.merchant,
                description: PROPS.description,
                expiresAt: expect.any(String),
            });
            const expiresIn = Date.parse(body.expiresAt) - mountedAt;
            expect(expiresIn).toBeGreaterThan(23 * 60 * 60 * 1000);
            expect(expiresIn).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 5000);
        });

        test("still creates the order intent when the registration PUT fails, so encrypted-card gets its turn", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            fetchMock
                .mockResolvedValueOnce(json(404, { message: "not found" }))
                .mockResolvedValueOnce(json(400, { message: "consumer email required" }))
                .mockResolvedValueOnce(json(201, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(onAuthorized.mock.calls[0][0].rail).toEqual({ rail: "encrypted-card" });
            expect(onError).not.toHaveBeenCalled();
            expect(requests()).toHaveLength(3);
            warn.mockRestore();
        });

        test("reports registration_failed when the PUT failed and the order intent has no usable rail", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            fetchMock
                .mockResolvedValueOnce(json(404, { message: "not found" }))
                .mockResolvedValueOnce(json(400, { message: "card not eligible" }))
                .mockResolvedValueOnce(json(201, orderIntent([SPT_ACTIVE])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onError).toHaveBeenCalled());
            expect(onError.mock.calls[0][0]).toMatchObject({
                code: "registration_failed",
                message: expect.stringContaining("card not eligible"),
            });
            expect(onAuthorized).not.toHaveBeenCalled();
            warn.mockRestore();
        });
    });

    describe("when vic is pending verification and agentpay is already active", () => {
        test("takes the active agentpay rail without a verification step, as the server would", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(
                    json(201, orderIntent([AGENTPAY_ACTIVE, VIC_PENDING], { verificationConfig: VERIFICATION_CONFIG }))
                );
            const { onAuthorized } = renderComponent();

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(screen.queryByTestId("verification")).toBeNull();
            expect(onAuthorized.mock.calls[0][0].rail).toEqual({ rail: "agentic-token", provider: "agentpay" });
        });
    });

    describe("when vic is the only rail and it is pending verification", () => {
        test("renders the verification, then reports vic once the re-read shows it active", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(
                    json(201, orderIntent([VIC_PENDING], { verificationConfig: VERIFICATION_CONFIG }))
                )
                .mockResolvedValueOnce(json(200, orderIntent([VIC_ACTIVE])));
            const { onAuthorized } = renderComponent();

            selectCard();

            await waitFor(() => expect(screen.getByTestId("verification")).toBeInTheDocument());
            expect(screen.queryByTestId("pmm")).toBeNull();
            expect(stubs.verification.props).toMatchObject({
                displayName: "Example Shop",
                orderIntent: expect.objectContaining({
                    orderIntentId: "oi_1",
                    verificationConfig: VERIFICATION_CONFIG,
                }),
            });

            act(() => stubs.verification.props?.onVerificationComplete?.());

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(requests().at(-1)).toBe("GET /api/unstable/order-intents/oi_1");
            expect(onAuthorized.mock.calls[0][0].rail).toEqual({ rail: "agentic-token", provider: "vic" });
        });

        test("reports verification_failed when the verification UI fails", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(
                    json(201, orderIntent([VIC_PENDING], { verificationConfig: VERIFICATION_CONFIG }))
                );
            const { onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("verification")).toBeInTheDocument());
            act(() => stubs.verification.props?.onVerificationError?.(new Error("buyer closed the challenge")));

            expect(onError).toHaveBeenCalledWith({
                code: "verification_failed",
                message: "buyer closed the challenge",
            });
            expect(screen.getByTestId("pmm")).toBeInTheDocument();
        });

        test("reports rail_unavailable when the pending rail needs a verification the order intent cannot run", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_PENDING])));
            const { onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onError).toHaveBeenCalled());
            expect(onError.mock.calls[0][0].code).toBe("rail_unavailable");
            expect(screen.queryByTestId("verification")).toBeNull();
        });

        test("falls back to the CVC refresh when vic is pending but the order intent cannot verify", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_PENDING, ENCRYPTED_PENDING_CVC])));
            renderComponent();

            selectCard();

            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            expect(screen.queryByTestId("verification")).toBeNull();
        });
    });

    describe("when the same card is selected again after a failed attempt", () => {
        test("re-reads the order intent it already created instead of creating a second one", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(
                    json(201, orderIntent([VIC_PENDING], { verificationConfig: VERIFICATION_CONFIG }))
                )
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(200, orderIntent([VIC_ACTIVE])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("verification")).toBeInTheDocument());
            act(() => stubs.verification.props?.onVerificationError?.(new Error("closed")));
            expect(onError).toHaveBeenCalledTimes(1);

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(requests().filter((request) => request.startsWith("POST"))).toHaveLength(1);
            expect(requests().at(-1)).toBe("GET /api/unstable/order-intents/oi_1");
        });
    });

    describe("when the order intent has no card-capable rail", () => {
        test("reports rail_unavailable for an spt-only order intent", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([SPT_ACTIVE])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onError).toHaveBeenCalled());
            expect(onError.mock.calls[0][0].code).toBe("rail_unavailable");
            expect(onAuthorized).not.toHaveBeenCalled();
        });
    });

    describe("when the encrypted-card rail is waiting for a CVC refresh", () => {
        test("renders the CVC recollection and reports encrypted-card once the rail is active", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            expect(stubs.cvc.props).toMatchObject({ jwt: "jwt-1", paymentMethodId: "pm_1" });

            act(() => stubs.cvc.props?.onComplete?.());

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(onAuthorized.mock.calls[0][0].rail).toEqual({ rail: "encrypted-card" });
        });
    });

    describe("when the CVC iframe reports completion more than once", () => {
        test("polls once and reports onAuthorized exactly once", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() => {
                stubs.cvc.props?.onComplete?.();
                stubs.cvc.props?.onComplete?.();
            });

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(requests().filter((request) => request === "GET /api/unstable/order-intents/oi_1")).toHaveLength(1);
            expect(onError).not.toHaveBeenCalled();
        });

        test("never reports both onError and onAuthorized when an error follows a completion", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() => {
                stubs.cvc.props?.onComplete?.();
                stubs.cvc.props?.onError?.({ retriable: false, reason: "provider-error", message: "vault timeout" });
            });

            await waitFor(() => expect(requests()).toContain("GET /api/unstable/order-intents/oi_1"));
            await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0].code).toBe("verification_failed");
            expect(onAuthorized).not.toHaveBeenCalled();
        });
    });

    describe("when the CVC form reports a retriable error", () => {
        test("keeps the form mounted and reports onAuthorized once the buyer resubmits", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() =>
                stubs.cvc.props?.onError?.({
                    retriable: true,
                    reason: "provider-error",
                    message: "Basis Theory could not update the card",
                })
            );
            expect(screen.getByTestId("cvc")).toBeInTheDocument();

            act(() => stubs.cvc.props?.onComplete?.());

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("when a rail step fails while an earlier completion is still polling", () => {
        test("polls again for the next attempt and reports onAuthorized once", async () => {
            let releaseStalePoll: ((response: Response) => void) | undefined;
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockReturnValueOnce(new Promise((resolve) => (releaseStalePoll = resolve)))
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(200, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() => stubs.cvc.props?.onComplete?.());
            await waitFor(() => expect(requests()).toContain("GET /api/unstable/order-intents/oi_1"));
            act(() =>
                stubs.cvc.props?.onError?.({ retriable: false, reason: "provider-error", message: "vault timeout" })
            );
            expect(screen.getByTestId("pmm")).toBeInTheDocument();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() => stubs.cvc.props?.onComplete?.());

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            await act(async () => releaseStalePoll?.(json(200, orderIntent([ENCRYPTED_PENDING_CVC]))));
            expect(onAuthorized).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledTimes(1);
        });
    });

    describe("when the cached order intent has expired", () => {
        test("forgets it and creates a new one when the card is selected again", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE], { status: "expired" })))
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE], { orderIntentId: "oi_2" })));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            expect(onError.mock.calls[0][0].code).toBe("expired");

            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            expect(requests().filter((request) => request.startsWith("POST"))).toHaveLength(2);
            expect(onAuthorized.mock.calls[0][0].orderIntentId).toBe("oi_2");
        });
    });

    describe("when the payment-method UI reports something that is not a card", () => {
        test("reports payment_method_selection_failed without calling the API", () => {
            const { onError } = renderComponent();

            selectCard({
                type: "bank-account-us",
                paymentMethodId: "pm_2",
                bankAccount: { accountSuffix: "6789", bankName: "Example Bank", accountType: "checking" },
            });

            expect(onError.mock.calls[0][0].code).toBe("payment_method_selection_failed");
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe("when the API rejects the order intent", () => {
        test("reports order_intent_creation_failed with the server message", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(400, { message: "amount.value must have at most 4 decimal places" }));
            const { onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onError).toHaveBeenCalled());
            expect(onError).toHaveBeenCalledWith({
                code: "order_intent_creation_failed",
                message: "amount.value must have at most 4 decimal places",
            });
        });

        test("reports expired for an order intent that is no longer active", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE], { status: "expired" })));
            const { onError } = renderComponent();

            selectCard();

            await waitFor(() => expect(onError).toHaveBeenCalled());
            expect(onError.mock.calls[0][0].code).toBe("expired");
        });
    });

    describe("when there is no JWT in the Crossmint context", () => {
        test("renders nothing and reports missing_jwt once, after a grace period for the auth provider", () => {
            vi.useFakeTimers();
            stubs.crossmint.crossmint.jwt = undefined;

            const { container, onError, rerender, onAuthorized } = renderComponent();
            act(() => vi.advanceTimersByTime(MISSING_JWT_GRACE_MS / 2));
            expect(onError).not.toHaveBeenCalled();

            act(() => vi.advanceTimersByTime(MISSING_JWT_GRACE_MS));
            rerender(<CrossmintAgentCardAuthorization {...PROPS} onAuthorized={onAuthorized} onError={onError} />);
            act(() => vi.advanceTimersByTime(MISSING_JWT_GRACE_MS * 2));

            expect(container).toBeEmptyDOMElement();
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0].code).toBe("missing_jwt");
        });

        test("does not report missing_jwt when the session arrives within the grace period", () => {
            vi.useFakeTimers();
            stubs.crossmint.crossmint.jwt = undefined;

            const { onError, rerender, onAuthorized } = renderComponent();
            act(() => vi.advanceTimersByTime(MISSING_JWT_GRACE_MS / 2));
            stubs.crossmint.crossmint.jwt = "jwt-1";
            rerender(<CrossmintAgentCardAuthorization {...PROPS} onAuthorized={onAuthorized} onError={onError} />);
            act(() => vi.advanceTimersByTime(MISSING_JWT_GRACE_MS * 2));

            expect(screen.getByTestId("pmm")).toBeInTheDocument();
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("when the JWT is refreshed", () => {
        test("keeps the payment-method UI on the JWT it was opened with, so its iframe is not reloaded", () => {
            const { onError, rerender, onAuthorized } = renderComponent();
            expect(screen.getByTestId("pmm").dataset.jwt).toBe("jwt-1");

            stubs.crossmint.crossmint.jwt = "jwt-2";
            rerender(<CrossmintAgentCardAuthorization {...PROPS} onAuthorized={onAuthorized} onError={onError} />);

            expect(screen.getByTestId("pmm").dataset.jwt).toBe("jwt-1");
        });

        test("opens a later step, and a re-mounted payment-method UI, with the current JWT", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])));
            const { onError, rerender, onAuthorized } = renderComponent();

            stubs.crossmint.crossmint.jwt = "jwt-2";
            rerender(<CrossmintAgentCardAuthorization {...PROPS} onAuthorized={onAuthorized} onError={onError} />);
            expect(screen.getByTestId("pmm").dataset.jwt).toBe("jwt-1");

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            expect(screen.getByTestId("cvc").dataset.jwt).toBe("jwt-2");

            act(() =>
                stubs.cvc.props?.onError?.({ retriable: false, reason: "provider-error", message: "vault timeout" })
            );

            expect(screen.getByTestId("pmm").dataset.jwt).toBe("jwt-2");
        });
    });

    describe("when the request props change between two selections of the same card", () => {
        test("creates a new order intent instead of re-reading the one for the old amount", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(
                    json(201, orderIntent([VIC_PENDING], { verificationConfig: VERIFICATION_CONFIG }))
                )
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([VIC_ACTIVE], { orderIntentId: "oi_2" })));
            const { onAuthorized, onError, rerender } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("verification")).toBeInTheDocument());
            act(() => stubs.verification.props?.onVerificationError?.(new Error("closed")));
            expect(onError).toHaveBeenCalledTimes(1);

            rerender(
                <CrossmintAgentCardAuthorization
                    {...PROPS}
                    amount={{ value: "40.00", currency: "USD" }}
                    onAuthorized={onAuthorized}
                    onError={onError}
                />
            );
            selectCard();

            await waitFor(() => expect(onAuthorized).toHaveBeenCalledTimes(1));
            const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
            expect(posts).toHaveLength(2);
            expect(JSON.parse(String(posts[1][1]?.body)).amount).toEqual({ value: "40.00", currency: "USD" });
            expect(onAuthorized.mock.calls[0][0].orderIntentId).toBe("oi_2");
        });
    });

    describe("when re-reading the order intent after a rail step", () => {
        test("retries a transient failure instead of failing the verification", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(new Response("upstream down", { status: 502, statusText: "Bad Gateway" }))
                .mockResolvedValueOnce(json(200, orderIntent([{ ...ENCRYPTED_PENDING_CVC, status: "active" }])));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            vi.useFakeTimers();
            act(() => stubs.cvc.props?.onComplete?.());
            await act(async () => {
                await vi.advanceTimersByTimeAsync(RAIL_POLL_INTERVAL_MS + 10);
            });

            expect(onAuthorized).toHaveBeenCalledTimes(1);
            expect(onError).not.toHaveBeenCalled();
        });

        test("fails at once on a 4xx, which another read would not fix", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])))
                .mockResolvedValueOnce(json(404, { message: "order intent not found" }));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            act(() => stubs.cvc.props?.onComplete?.());

            await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
            expect(onError).toHaveBeenCalledWith({ code: "verification_failed", message: "order intent not found" });
            expect(onAuthorized).not.toHaveBeenCalled();
        });

        test("reports verification_failed when the rail is still pending at the end of the budget", async () => {
            fetchMock
                .mockResolvedValueOnce(json(200, REGISTERED))
                .mockResolvedValueOnce(json(201, orderIntent([ENCRYPTED_PENDING_CVC])));
            // A fresh Response per read: a body can only be consumed once.
            fetchMock.mockImplementation(() => Promise.resolve(json(200, orderIntent([ENCRYPTED_PENDING_CVC]))));
            const { onAuthorized, onError } = renderComponent();

            selectCard();
            await waitFor(() => expect(screen.getByTestId("cvc")).toBeInTheDocument());
            vi.useFakeTimers();
            act(() => stubs.cvc.props?.onComplete?.());
            await act(async () => {
                await vi.advanceTimersByTimeAsync(RAIL_POLL_TIMEOUT_MS + RAIL_POLL_INTERVAL_MS);
            });

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError.mock.calls[0][0]).toMatchObject({
                code: "verification_failed",
                message: expect.stringContaining("did not become active"),
            });
            expect(onAuthorized).not.toHaveBeenCalled();
            const reads = requests().filter((request) => request === "GET /api/unstable/order-intents/oi_1").length;
            expect(reads).toBeGreaterThanOrEqual(RAIL_POLL_TIMEOUT_MS / RAIL_POLL_INTERVAL_MS);
        });
    });
});
