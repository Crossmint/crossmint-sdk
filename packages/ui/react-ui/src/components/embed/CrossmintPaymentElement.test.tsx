import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";

import { CheckoutEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement } from ".";

const embeddedCheckoutProps = {
    clientId: "db218e78-d042-4761-83af-3c4e5e6659dd",
};

describe("CrossmintPaymentElement", () => {
    it("renders an iframe with the correct props", () => {
        render(<CrossmintPaymentElement {...embeddedCheckoutProps} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe).toHaveAttribute("src");
        expect(iframe).toHaveAttribute("id", "crossmint-embedded-checkout.iframe");
        expect(iframe).toHaveStyle({
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
        render(<CrossmintPaymentElement {...embeddedCheckoutProps} onEvent={onEvent} environment="" />);
        screen.getByRole("crossmint-embedded-checkout.iframe");

        // Simulate receiving a CrossmintCheckoutEvent message
        const eventData = { type: CheckoutEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "https://www.crossmint.com" });
        window.dispatchEvent(event);

        expect(onEvent).toHaveBeenCalledWith(eventData);
    });

    it("does not call the onEvent prop when a different origin than the environment is received in the event", () => {
        const onEvent = jest.fn();
        render(<CrossmintPaymentElement {...embeddedCheckoutProps} onEvent={onEvent} environment="" />);
        screen.getByRole("crossmint-embedded-checkout.iframe");

        // Simulate receiving a CrossmintCheckoutEvent message
        const eventData = { type: CheckoutEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "http://hacker.com" });
        window.dispatchEvent(event);

        expect(onEvent).not.toHaveBeenCalled();
    });

    it("should add the `whPassThroughArgs` prop when passed", async () => {
        render(<CrossmintPaymentElement {...embeddedCheckoutProps} whPassThroughArgs={{ hello: "hi" }} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain("whPassThroughArgs=%7B%22hello%22%3A%22hi%22%7D");
    });

    it("should add the clientId when passing the collectionId prop", () => {
        render(<CrossmintPaymentElement collectionId={embeddedCheckoutProps.clientId} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain(`clientId=${embeddedCheckoutProps.clientId}`);
    });

    it("should add projectId when added", () => {
        render(<CrossmintPaymentElement collectionId={embeddedCheckoutProps.clientId} projectId="123" />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain("projectId=123");
    });
});
