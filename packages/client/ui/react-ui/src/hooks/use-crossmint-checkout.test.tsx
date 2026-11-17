import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { describe, expect, test, vi } from "vitest";
import { CrossmintCheckoutProvider, useCrossmintCheckout } from "./useCrossmintCheckout";
import { useTrustCheckoutWindow } from "./useTrustCheckoutWindow";

const CHECKOUT_ORIGIN = "https://staging.crossmint.com";

vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => ({ crossmint: { apiKey: "ck_staging_key" } }),
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({ baseUrl: CHECKOUT_ORIGIN }),
}));

function createWindow() {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    return iframe.contentWindow as Window;
}

function CheckoutState({ trustedWindow }: { trustedWindow?: Window }) {
    const trustCheckoutWindow = useTrustCheckoutWindow();
    useEffect(() => {
        if (trustedWindow != null) {
            return trustCheckoutWindow?.(trustedWindow);
        }
    }, [trustedWindow, trustCheckoutWindow]);
    const { order, orderClientSecret } = useCrossmintCheckout();
    return (
        <>
            <span data-testid="order-id">{order?.orderId ?? "none"}</span>
            <span data-testid="client-secret">{orderClientSecret ?? "none"}</span>
        </>
    );
}

function postMessage({ origin, source, data }: { origin: string; source: Window | null; data: unknown }) {
    act(() => {
        window.dispatchEvent(new MessageEvent("message", { origin, source, data }));
    });
}

function orderUpdated(orderId: string) {
    return { event: "order:updated", data: { order: { orderId }, orderClientSecret: `secret-${orderId}` } };
}

describe("CrossmintCheckoutProvider", () => {
    describe("when the checkout window sends order:updated", () => {
        test("exposes the order and client secret", () => {
            const checkoutWindow = createWindow();
            render(
                <CrossmintCheckoutProvider>
                    <CheckoutState trustedWindow={checkoutWindow} />
                </CrossmintCheckoutProvider>
            );

            postMessage({ origin: CHECKOUT_ORIGIN, source: checkoutWindow, data: orderUpdated("order-1") });

            expect(screen.getByTestId("order-id").textContent).toBe("order-1");
            expect(screen.getByTestId("client-secret").textContent).toBe("secret-order-1");
        });
    });

    describe.each([
        {
            context: "a Crossmint-origin window that is not the checkout sends order:updated",
            message: () => ({ origin: CHECKOUT_ORIGIN, source: createWindow(), data: orderUpdated("forged") }),
        },
        {
            context: "a message has no source window",
            message: () => ({ origin: CHECKOUT_ORIGIN, source: null, data: orderUpdated("forged") }),
        },
        {
            context: "the checkout window sends from another origin",
            message: (checkoutWindow: Window) => ({
                origin: "https://evil.example",
                source: checkoutWindow,
                data: orderUpdated("forged"),
            }),
        },
        {
            context: "the checkout window sends an order:updated payload with the wrong shape",
            message: (checkoutWindow: Window) => ({
                origin: CHECKOUT_ORIGIN,
                source: checkoutWindow,
                data: { event: "order:updated", data: { orderClientSecret: 42 } },
            }),
        },
        {
            context: "the checkout window sends a message with no data",
            message: (checkoutWindow: Window) => ({ origin: CHECKOUT_ORIGIN, source: checkoutWindow, data: null }),
        },
    ])("when $context", ({ message }) => {
        test("keeps the order unset", () => {
            const checkoutWindow = createWindow();
            render(
                <CrossmintCheckoutProvider>
                    <CheckoutState trustedWindow={checkoutWindow} />
                </CrossmintCheckoutProvider>
            );

            postMessage(message(checkoutWindow));

            expect(screen.getByTestId("order-id").textContent).toBe("none");
            expect(screen.getByTestId("client-secret").textContent).toBe("none");
        });
    });

    describe("when the checkout window is removed and then sends order:updated", () => {
        test("keeps the order unset", () => {
            const checkoutWindow = createWindow();
            const { rerender } = render(
                <CrossmintCheckoutProvider>
                    <CheckoutState trustedWindow={checkoutWindow} />
                </CrossmintCheckoutProvider>
            );
            rerender(
                <CrossmintCheckoutProvider>
                    <CheckoutState />
                </CrossmintCheckoutProvider>
            );

            postMessage({ origin: CHECKOUT_ORIGIN, source: checkoutWindow, data: orderUpdated("stale") });

            expect(screen.getByTestId("order-id").textContent).toBe("none");
        });
    });
});
