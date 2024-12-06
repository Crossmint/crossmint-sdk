import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CrossmintEvents } from "@crossmint/client-sdk-base";

import { CrossmintPaymentElement_DEPRECATED } from ".";

const embeddedCheckoutProps = {
    clientId: "db218e78-d042-4761-83af-3c4e5e6659dd",
};

describe("CrossmintPaymentElement_DEPRECATED", () => {
    it("renders an iframe with the correct props", () => {
        render(<CrossmintPaymentElement_DEPRECATED {...embeddedCheckoutProps} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe).toHaveAttribute("src");
        expect(iframe).toHaveAttribute("id", "crossmint-embedded-checkout.iframe");
        expect(iframe).toHaveStyle({
            padding: "0px",
            width: "100%",
            minWidth: "100%",
            overflow: "hidden",
            display: "block",
            userSelect: "none",
            transform: "translate(0px)",
            opacity: "1",
            transition: "ease 0s, opacity 0.4s ease 0.1s",
        });
    });

    it("calls the onEvent prop when a CrossmintEvents is received", () => {
        const onEvent = vi.fn();
        render(<CrossmintPaymentElement_DEPRECATED {...embeddedCheckoutProps} onEvent={onEvent} environment="" />);
        screen.getByRole("crossmint-embedded-checkout.iframe");

        // Simulate receiving a CrossmintEvents message
        const eventData = { type: CrossmintEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "https://www.crossmint.com" });
        window.dispatchEvent(event);

        expect(onEvent).toHaveBeenCalledWith(eventData);
    });

    it("does not call the onEvent prop when a different origin than the environment is received in the event", () => {
        const onEvent = vi.fn();
        render(<CrossmintPaymentElement_DEPRECATED {...embeddedCheckoutProps} onEvent={onEvent} environment="" />);
        screen.getByRole("crossmint-embedded-checkout.iframe");

        // Simulate receiving a CrossmintEvents message
        const eventData = { type: CrossmintEvents.QUOTE_STATUS_CHANGED, payload: {} };
        const event = new MessageEvent("message", { data: eventData, origin: "http://hacker.com" });
        window.dispatchEvent(event);

        expect(onEvent).not.toHaveBeenCalled();
    });

    it("should add the `whPassThroughArgs` prop when passed", async () => {
        render(<CrossmintPaymentElement_DEPRECATED {...embeddedCheckoutProps} whPassThroughArgs={{ hello: "hi" }} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain("whPassThroughArgs=%7B%22hello%22%3A%22hi%22%7D");
    });

    it("should add the clientId when passing the collectionId prop", () => {
        render(<CrossmintPaymentElement_DEPRECATED collectionId={embeddedCheckoutProps.clientId} />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain(`clientId=${embeddedCheckoutProps.clientId}`);
    });

    it("should add projectId when added", () => {
        render(<CrossmintPaymentElement_DEPRECATED collectionId={embeddedCheckoutProps.clientId} projectId="123" />);
        const iframe = screen.getByRole("crossmint-embedded-checkout.iframe");

        expect(iframe.getAttribute("src")).toContain("projectId=123");
    });
});
