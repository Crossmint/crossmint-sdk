import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, createRef } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { CrossmintPaymentMethodManagementRef } from "@crossmint/client-sdk-base";
import { CrossmintPaymentMethodManagement } from "./CrossmintPaymentMethodManagement";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    sendAction: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnValue("subscription"),
    getUrl: vi.fn().mockReturnValue("https://staging.crossmint.com/sdk/unstable/payment-method-management"),
    createClient: vi.fn(),
}));
vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createPaymentMethodManagementService: () => ({
        iframe: {
            getUrl: mocks.getUrl,
            createClient: mocks.createClient,
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({ useCrossmint: () => ({ crossmint: mocks.crossmint }) }));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));

const CARD = {
    type: "card",
    paymentMethodId: "pm_1",
    card: {
        source: { type: "basis-theory-token", id: "bt_1" },
        brand: "visa",
        last4: "4242",
        expiration: { month: "08", year: "2030" },
    },
} as const;
const SAVED = { status: "saved", paymentMethod: CARD } as const;

function mount({ load = true, onSelected }: { load?: boolean; onSelected?: (method: unknown) => void } = {}) {
    const ref = createRef<CrossmintPaymentMethodManagementRef>();
    const view = render(
        <CrossmintPaymentMethodManagement
            ref={ref}
            jwt="buyer-jwt"
            hideSubmitButton
            onPaymentMethodSelected={onSelected}
        />
    );
    if (load) {
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
    }
    if (ref.current == null) {
        throw new Error("The component ref did not mount");
    }
    return { ...view, ref, component: ref.current };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

beforeEach(() => {
    vi.resetAllMocks();
    mocks.handshakeWithChild.mockResolvedValue(undefined);
    mocks.on.mockReturnValue("subscription");
    mocks.createClient.mockImplementation(() => ({ ...mocks }));
    mocks.getUrl.mockImplementation(
        (props) =>
            `https://staging.crossmint.com/sdk/unstable/payment-method-management?jwt=${props.jwt}&hidden=${props.hideSubmitButton ?? false}`
    );
});

describe("CrossmintPaymentMethodManagement ref", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("submit asks the iframe and resolves with its result for the same request", async () => {
        mocks.sendAction.mockImplementationOnce(async ({ data }: { data: { requestId: string } }) => ({
            requestId: data.requestId,
            result: SAVED,
        }));
        const { component } = mount();

        await expect(component.submit()).resolves.toEqual(SAVED);

        const call = mocks.sendAction.mock.calls[0][0];
        expect(call.event).toBe("payment-method:submit");
        expect(call.responseEvent).toBe("payment-method:result");
        expect(call.options.condition({ requestId: call.data.requestId })).toBe(true);
        expect(call.options.condition({ requestId: "another" })).toBe(false);
        expect(call.options.timeoutMs).toBe(60_000);
    });

    test("shares a submit in flight and starts a new one after it settles", async () => {
        let complete!: (value: { requestId: string; result: typeof SAVED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        mocks.sendAction.mockResolvedValueOnce({ requestId: "r2", result: SAVED });
        const { component } = mount();

        const first = component.submit();
        const second = component.submit();
        expect(first).toBe(second);
        await act(async () => {
            complete({ requestId: "r1", result: SAVED });
            await first;
        });
        const third = component.submit();
        expect(third).not.toBe(first);
        await expect(third).resolves.toEqual(SAVED);
        expect(mocks.sendAction).toHaveBeenCalledTimes(2);
    });

    test("a failed handshake resolves unavailable and the next submit retries it", async () => {
        mocks.handshakeWithChild.mockRejectedValueOnce(new Error("Handshake timed out"));
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({ status: "unavailable" });
        expect(mocks.sendAction).not.toHaveBeenCalled();

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(component.submit()).resolves.toEqual(SAVED);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
    });

    test("resolves unavailable when the iframe does not answer in time", async () => {
        mocks.sendAction.mockRejectedValueOnce("Timed out waiting for payment-method:result event");
        const { component } = mount();

        await expect(component.submit()).resolves.toMatchObject({
            status: "unavailable",
            message:
                "The payment method component did not answer in time. The payment method may still have been saved: onPaymentMethodSelected fires if it was, and submitting again returns it.",
        });
    });

    test("under StrictMode the iframe document gets one client and one handshake", async () => {
        const ref = createRef<CrossmintPaymentMethodManagementRef>();
        render(
            <StrictMode>
                <CrossmintPaymentMethodManagement ref={ref} jwt="buyer-jwt" hideSubmitButton />
            </StrictMode>
        );

        expect(mocks.createClient).toHaveBeenCalledTimes(1);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(1);

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(ref.current?.submit()).resolves.toEqual(SAVED);
    });

    test("the first load keeps a pending submit; a second load creates a new client and supersedes", async () => {
        const selected = vi.fn();
        const firstReply = deferred<{ result: typeof SAVED }>();
        const secondReply = deferred<{ result: typeof SAVED }>();
        mocks.sendAction.mockReturnValueOnce(firstReply.promise).mockReturnValueOnce(secondReply.promise);
        const { component } = mount({ load: false, onSelected: selected });
        const retiredListener = mocks.on.mock.calls.find(([event]) => event === "payment-method:selected")?.[1];
        const pending = component.submit();
        await act(async () => {
            await Promise.resolve();
        });

        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));
        await act(async () => {
            firstReply.resolve({ result: SAVED });
            await firstReply.promise;
        });
        await expect(pending).resolves.toEqual(SAVED);
        expect(mocks.createClient).toHaveBeenCalledTimes(1);

        const next = component.submit();
        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.load(screen.getByRole("crossmint-payment-method-management.iframe"));

        await expect(next).resolves.toMatchObject({ status: "superseded" });
        await act(async () => {
            secondReply.resolve({ result: SAVED });
            await secondReply.promise;
        });
        expect(mocks.createClient).toHaveBeenCalledTimes(2);
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);

        retiredListener?.(CARD);
        expect(selected).not.toHaveBeenCalled();
        mocks.on.mock.calls
            .filter(([event]) => event === "payment-method:selected")
            .at(-1)?.[1](CARD);
        expect(selected).toHaveBeenCalledWith(CARD);

        mocks.sendAction.mockResolvedValueOnce({ result: SAVED });
        await expect(component.submit()).resolves.toEqual(SAVED);
    });

    test("renders children after the iframe and the footer once the iframe delegates it", () => {
        render(
            <CrossmintPaymentMethodManagement jwt="buyer-jwt" hideSubmitButton>
                <button type="button">Save card</button>
            </CrossmintPaymentMethodManagement>
        );

        const delegated = mocks.on.mock.calls.find(([event]) => event === "ui:poweredBy.delegated")?.[1];
        expect(delegated).toBeDefined();
        expect(screen.getByText("Save card")).toBeInTheDocument();
        // Until the iframe confirms it hid its own footer, drawing one here could double it.
        expect(screen.queryByText("Powered by Crossmint")).not.toBeInTheDocument();

        act(() => delegated?.({}));

        const iframe = screen.getByRole("crossmint-payment-method-management.iframe");
        const button = screen.getByText("Save card");
        const footer = screen.getByText("Powered by Crossmint");
        expect(iframe.compareDocumentPosition(button)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
        expect(button.compareDocumentPosition(footer)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    test("ignores a delegated footer event from a stale iframe", () => {
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" hideSubmitButton />);
        const stale = mocks.on.mock.calls.find(([event]) => event === "ui:poweredBy.delegated")?.[1];

        mocks.on.mockClear();
        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" hideSubmitButton />);
        act(() => stale?.({}));
        expect(screen.queryByText("Powered by Crossmint")).not.toBeInTheDocument();

        const fresh = mocks.on.mock.calls.find(([event]) => event === "ui:poweredBy.delegated")?.[1];
        act(() => fresh?.({}));
        expect(screen.getByText("Powered by Crossmint")).toBeInTheDocument();
    });

    test("keeps the last reported height when the iframe URL changes until the new iframe reports", () => {
        const view = render(<CrossmintPaymentMethodManagement jwt="buyer-jwt" />);
        const heightListener = mocks.on.mock.calls.find(([event]) => event === "ui:height.changed")?.[1];
        act(() => heightListener?.({ height: 400 }));
        expect(screen.getByRole("crossmint-payment-method-management.iframe").style.height).toBe("400px");

        mocks.on.mockClear();
        view.rerender(<CrossmintPaymentMethodManagement jwt="new-buyer" />);

        const newIframe = screen.getByRole("crossmint-payment-method-management.iframe");
        expect(newIframe.style.height).toBe("400px");
        const newListener = mocks.on.mock.calls.find(([event]) => event === "ui:height.changed")?.[1];
        act(() => newListener?.({ height: 500 }));
        expect(newIframe.style.height).toBe("500px");
    });
});
