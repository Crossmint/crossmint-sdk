import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import React from "react";

import { CheckoutEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement } from "../src/CrossmintPaymentElement";

const paymentElementProps = {
    clientId: "db218e78-d042-4761-83af-3c4e5e6659dd",
};

describe("CrossmintPaymentElement", () => {
    it("renders an iframe with the correct props", () => {
        render(<CrossmintPaymentElement {...paymentElementProps} />);
        const iframe = screen.getByRole("iframe-crossmint-payment-element");

        (expect(iframe) as any).toHaveAttribute("src");
        (expect(iframe) as any).toHaveAttribute("id", "iframe-crossmint-payment-element");
        (expect(iframe) as any).toHaveStyle({
            padding: "0px !important",
            width: "100% !important",
            minWidth: "100% !important",
            overflow: "hidden !important",
            display: "block !important",
            userSelect: "none",
            transform: "translate(0px) !important",
            opacity: "1",
            transition: "ease 0s, opacity 0.4s ease 0.1s",
        });
    });

    it("calls the onEvent prop when a CrossmintCheckoutEvent is received", () => {
        const onEvent = jest.fn();
        render(<CrossmintPaymentElement {...paymentElementProps} onEvent={onEvent} environment="" />);
        screen.getByRole("iframe-crossmint-payment-element");

        // Simulate receiving a CrossmintCheckoutEvent message
        const eventData = { type: CheckoutEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "https://www.crossmint.com" });
        window.dispatchEvent(event);

        expect(onEvent).toHaveBeenCalledWith(eventData);
    });

    it("does not call the onEvent prop when a different origin than the environment is received in the event", () => {
        const onEvent = jest.fn();
        render(<CrossmintPaymentElement {...paymentElementProps} onEvent={onEvent} environment="" />);
        screen.getByRole("iframe-crossmint-payment-element");

        // Simulate receiving a CrossmintCheckoutEvent message
        const eventData = { type: CheckoutEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "http://hacker.com" });
        window.dispatchEvent(event);

        expect(onEvent).not.toHaveBeenCalled();
    });
});
