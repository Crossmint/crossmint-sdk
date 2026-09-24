import "@testing-library/jest-dom/vitest";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { CrossmintProtectedInput } from "./CrossmintProtectedInput";
import { LOAD_TIMEOUT_MS } from "./CrossmintProtectedInputIFrame";

const listeners = new Map<string, (data: unknown) => void>();
// Returns an id distinct from the event name on purpose, so the unmount test
// fails if cleanup passes event names to off() instead of the returned ids.
const iframeClient = {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
        listeners.set(event, handler);
        return `listener-id:${event}`;
    }),
    off: vi.fn(),
};
const getUrl = vi.fn(
    ({ jwt }: { jwt: string }) => `https://staging.crossmint.com/sdk/unstable/protected-input?merchantUrl=x&jwt=${jwt}`
);
const createClient = vi.fn(() => iframeClient);

// Keep the real prop validator; only the iframe service is stubbed.
vi.mock("@crossmint/client-sdk-base", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@crossmint/client-sdk-base")>()),
    createProtectedInputService: () => ({
        iframe: {
            getUrl,
            createClient,
        },
    }),
}));

// Stable across renders, like the real context value, so the service is not rebuilt per render.
const crossmintContext = { crossmint: { apiKey: "ck_staging_key" } };
vi.mock("@crossmint/client-sdk-react-base", () => ({
    useCrossmint: () => crossmintContext,
}));

vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: () => ({}),
}));

const PROPS = { jwt: "jwt-1", merchantUrl: "https://shop.example.com/login", label: "Example Shop" } as const;
const CREATED = {
    protectedInputId: "pi_1",
    purpose: "password",
    merchant: { domain: "shop.example.com" },
    expiresAt: "2026-09-24T12:00:00.000Z",
} as const;

function emit(event: string, data: unknown) {
    const handler = listeners.get(event);
    if (handler == null) {
        throw new Error(`no listener registered for ${event}`);
    }
    act(() => handler(data));
}

function advance(ms: number) {
    act(() => {
        vi.advanceTimersByTime(ms);
    });
}

describe("<CrossmintProtectedInput />", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        cleanup();
        vi.useRealTimers();
        listeners.clear();
        vi.clearAllMocks();
    });

    describe("when mounted with a jwt", () => {
        test("renders an iframe pointed at the protected-input route", () => {
            render(<CrossmintProtectedInput {...PROPS} />);

            expect(screen.getByTitle("Protected input").getAttribute("src")).toContain("/sdk/unstable/protected-input");
        });

        test("builds the URL from the props, including the jwt, and the embedding page origin", () => {
            render(<CrossmintProtectedInput {...PROPS} onCreated={vi.fn()} />);

            expect(getUrl).toHaveBeenLastCalledWith(expect.objectContaining(PROPS), {
                targetOrigin: window.location.origin,
            });
            expect(screen.getByTitle("Protected input").getAttribute("src")).toContain("jwt=jwt-1");
        });

        test("requests no device permissions, since the password field is a plain text element", () => {
            render(<CrossmintProtectedInput {...PROPS} />);

            expect(screen.getByTitle("Protected input").hasAttribute("allow")).toBe(false);
        });

        test("renders nothing but the iframe: no field of its own that could hold the password", () => {
            const { container } = render(<CrossmintProtectedInput {...PROPS} />);

            expect(container.querySelectorAll("input, textarea, form")).toHaveLength(0);
            expect(container.children).toHaveLength(1);
            expect(container.firstElementChild?.tagName).toBe("IFRAME");
        });

        test("gives each instance its own iframe id", () => {
            render(
                <>
                    <CrossmintProtectedInput {...PROPS} />
                    <CrossmintProtectedInput {...PROPS} />
                </>
            );

            const ids = screen.getAllByTitle("Protected input").map((iframe) => iframe.id);
            expect(new Set(ids).size).toBe(2);
        });
    });

    describe("when the jwt prop changes", () => {
        test("points the same iframe at the new token instead of remounting it", () => {
            const { rerender } = render(<CrossmintProtectedInput {...PROPS} />);
            const iframe = screen.getByTitle("Protected input");

            rerender(<CrossmintProtectedInput {...PROPS} jwt="jwt-2" />);

            expect(screen.getByTitle("Protected input")).toBe(iframe);
            expect(iframe.getAttribute("src")).toContain("jwt=jwt-2");
            expect(createClient).toHaveBeenCalledTimes(1);
            expect(iframeClient.off).not.toHaveBeenCalled();
        });
    });

    describe("when the props fail validation", () => {
        test("reports invalid_params without loading the iframe", () => {
            const onError = vi.fn();
            render(<CrossmintProtectedInput jwt="jwt-1" merchantUrl="shop.example.com/login" onError={onError} />);

            expect(screen.queryByTitle("Protected input")).toBeNull();
            expect(getUrl).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith({
                code: "invalid_params",
                message: expect.stringContaining("merchantUrl"),
            });
        });
    });

    describe("when the hosted page never reports in", () => {
        test("reports load_timeout instead of staying invisible", () => {
            const onError = vi.fn();
            render(<CrossmintProtectedInput {...PROPS} onError={onError} />);

            advance(LOAD_TIMEOUT_MS + 1);

            expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: "load_timeout" }));
        });

        test("does not report load_timeout once the page has posted its height", () => {
            const onError = vi.fn();
            render(<CrossmintProtectedInput {...PROPS} onError={onError} />);

            emit("ui:height.changed", { height: 180 });
            advance(LOAD_TIMEOUT_MS + 1);

            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("when the iframe relays lifecycle events", () => {
        test("forwards protected-input:created to onCreated with the payload untouched", () => {
            const onCreated = vi.fn();
            render(<CrossmintProtectedInput {...PROPS} onCreated={onCreated} />);

            emit("protected-input:created", CREATED);

            expect(onCreated).toHaveBeenCalledTimes(1);
            expect(onCreated).toHaveBeenCalledWith(CREATED);
        });

        test("forwards protected-input:error to onError", () => {
            const onError = vi.fn();
            render(<CrossmintProtectedInput {...PROPS} onError={onError} />);

            emit("protected-input:error", { code: "provider_unavailable", message: "vault widget failed to load" });

            expect(onError).toHaveBeenCalledWith({
                code: "provider_unavailable",
                message: "vault widget failed to load",
            });
        });

        test("calls the callback from the latest render, not the one captured at subscribe time", () => {
            const stale = vi.fn();
            const fresh = vi.fn();
            const { rerender } = render(<CrossmintProtectedInput {...PROPS} onCreated={stale} />);

            rerender(<CrossmintProtectedInput {...PROPS} onCreated={fresh} />);
            emit("protected-input:created", CREATED);

            expect(fresh).toHaveBeenCalledTimes(1);
            expect(stale).not.toHaveBeenCalled();
        });

        test("applies the relayed height to the iframe", () => {
            render(<CrossmintProtectedInput {...PROPS} />);

            emit("ui:height.changed", { height: 180 });

            expect(screen.getByTitle("Protected input")).toHaveStyle({ height: "180px" });
        });
    });

    describe("when unmounted", () => {
        test("removes every listener by its returned id, not by event name", () => {
            const { unmount } = render(<CrossmintProtectedInput {...PROPS} />);

            unmount();

            for (const event of ["ui:height.changed", "protected-input:created", "protected-input:error"]) {
                expect(iframeClient.off).toHaveBeenCalledWith(`listener-id:${event}`);
            }
            expect(iframeClient.off).toHaveBeenCalledTimes(3);
        });
    });
});
