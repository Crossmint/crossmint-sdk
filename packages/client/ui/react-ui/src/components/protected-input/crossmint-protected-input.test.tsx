import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createRef, startTransition, Suspense, useLayoutEffect } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { CrossmintProtectedInputRef } from "@crossmint/client-sdk-base";
import { CrossmintProtectedInput } from "./CrossmintProtectedInput";

const mocks = vi.hoisted(() => ({
    crossmint: { apiKey: "ck_test" },
    send: vi.fn(),
    off: vi.fn(),
    handshakeWithChild: vi.fn().mockResolvedValue(undefined),
    sendAction: vi.fn(),
    on: vi.fn().mockReturnValue("height-subscription"),
}));
vi.mock("@crossmint/client-sdk-base", async (original) => ({
    ...(await original<typeof import("@crossmint/client-sdk-base")>()),
    createProtectedInputService: () => ({
        iframe: {
            getUrl: () => "https://staging.crossmint.com/sdk/unstable/protected-input",
            createClient: () => ({ ...mocks }),
        },
    }),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({ useCrossmint: () => ({ crossmint: mocks.crossmint }) }));
vi.mock("@/utils/createCrossmintApiClient", () => ({ createCrossmintApiClient: () => ({}) }));
const FIELD = {
    key: "code",
    label: "Verification code",
    required: true,
    handling: "protected",
    input: { kind: "text" },
} as const;
const COLLECTED = { status: "collected", input: { protectedInputId: "pi_test" } } as const;

function mount(jwt = "buyer-jwt") {
    const ref = createRef<CrossmintProtectedInputRef>();
    const view = render(<CrossmintProtectedInput ref={ref} field={FIELD} jwt={jwt} />);
    fireEvent.load(screen.getByTitle(FIELD.label));
    if (ref.current == null) {
        throw new Error("Protected input ref did not mount");
    }
    return { ...view, ref, input: ref.current };
}

describe("CrossmintProtectedInput", () => {
    afterEach(() => {
        cleanup();
        vi.clearAllMocks();
    });

    test("renders only an accessible iframe without permissions or host controls", () => {
        const { container } = mount();
        expect(container.querySelectorAll("input, textarea, select, button")).toHaveLength(0);
        expect(screen.getByTitle(FIELD.label)).not.toHaveAttribute("allow");
        expect(mocks.handshakeWithChild).toHaveBeenCalledOnce();
    });

    test("shares concurrent collections and returns only the protected reference", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input } = mount();
        const first = input.collect();
        const second = input.collect();
        expect(first).toBe(second);
        await act(async () => {
            complete({ result: COLLECTED });
            expect(await first).toEqual(COLLECTED);
        });
        expect(mocks.sendAction).toHaveBeenCalledOnce();
        expect(mocks.sendAction.mock.calls[0][0].data).toMatchObject({ jwt: "buyer-jwt", apiKey: "ck_test" });
        expect(mocks.sendAction.mock.calls[0][0].data).not.toHaveProperty("value");
    });

    test("supersedes a completed collection when buyer authentication changes", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input, ref, rerender } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="new-buyer" />);
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
    });

    test("invalidates auth that changes and returns to the original buyer", async () => {
        let complete!: (value: { result: typeof COLLECTED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input, ref, rerender } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="another-buyer" />);
        rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="buyer-jwt" />);
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.send).toHaveBeenCalledWith("protected-input:reset", {});
    });

    test("cancels the old collection before a parent layout effect collects for a new buyer", async () => {
        mocks.sendAction.mockReturnValueOnce(
            new Promise(() => {
                /* The old buyer's frame never replies. */
            })
        );
        mocks.sendAction.mockResolvedValueOnce({ result: COLLECTED });
        const ref = createRef<CrossmintProtectedInputRef>();
        let replacement: Promise<unknown> | undefined;
        function Parent({ jwt }: { jwt: string }) {
            useLayoutEffect(() => {
                if (jwt === "replacement-buyer") {
                    replacement = ref.current?.collect();
                }
            }, [jwt]);
            return <CrossmintProtectedInput ref={ref} field={FIELD} jwt={jwt} />;
        }
        const { rerender } = render(<Parent jwt="buyer-jwt" />);
        fireEvent.load(screen.getByTitle(FIELD.label));
        const original = ref.current?.collect();
        await act(async () => {
            await Promise.resolve();
        });
        const signal: AbortSignal = mocks.sendAction.mock.calls[0][0].options.signal;
        mocks.send.mockClear();
        rerender(<Parent jwt="replacement-buyer" />);
        await act(async () => {
            await Promise.resolve();
        });
        expect(signal.aborted).toBe(true);
        await expect(original).resolves.toMatchObject({ status: "superseded" });
        await expect(replacement).resolves.toEqual(COLLECTED);
        expect(mocks.sendAction.mock.calls[1][0].data.jwt).toBe("replacement-buyer");
        expect(mocks.send).toHaveBeenCalledWith("protected-input:reset", {});
        expect(mocks.send.mock.invocationCallOrder[0]).toBeLessThan(mocks.sendAction.mock.invocationCallOrder[1]);
    });

    test("keeps the committed buyer's collection when a concurrent render suspends", async () => {
        let complete!: (value: { result: typeof COLLECTED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const ref = createRef<CrossmintProtectedInputRef>();
        const suspended = new Promise(() => {
            /* The replacement buyer's render never becomes ready to commit. */
        });
        const attempted = vi.fn();
        function SuspendNewBuyer({ jwt }: { jwt: string }) {
            if (jwt === "uncommitted-buyer") {
                attempted();
                throw suspended;
            }
            return null;
        }
        function Parent({ jwt }: { jwt: string }) {
            return (
                <Suspense fallback={<p>Loading buyer</p>}>
                    <CrossmintProtectedInput ref={ref} field={FIELD} jwt={jwt} />
                    <SuspendNewBuyer jwt={jwt} />
                </Suspense>
            );
        }
        const { rerender } = render(<Parent jwt="buyer-jwt" />);
        const frame = screen.getByTitle(FIELD.label);
        fireEvent.load(frame);
        const original = ref.current?.collect();
        await act(async () => {
            await Promise.resolve();
        });
        mocks.send.mockClear();
        await act(async () => {
            startTransition(() => rerender(<Parent jwt="uncommitted-buyer" />));
        });
        expect(attempted).toHaveBeenCalled();
        expect(screen.queryByText("Loading buyer")).toBeNull();
        expect(screen.getByTitle(FIELD.label)).toBe(frame);
        expect(mocks.send).not.toHaveBeenCalledWith("protected-input:reset", {});
        expect(ref.current?.collect()).toBe(original);
        await act(async () => complete({ result: COLLECTED }));
        await expect(original).resolves.toEqual(COLLECTED);
    });

    test("updates disabled and invalid without reloading or cancelling collection", async () => {
        let complete!: (value: { result: typeof COLLECTED }) => void;
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { ref, input, rerender } = mount();
        const frame = screen.getByTitle(FIELD.label);
        const src = frame.getAttribute("src");
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        mocks.send.mockClear();
        for (const state of [true, false]) {
            rerender(
                <CrossmintProtectedInput ref={ref} field={FIELD} jwt="buyer-jwt" disabled={state} invalid={state} />
            );
            await act(async () => {
                await Promise.resolve();
            });
            expect(screen.getByTitle(FIELD.label)).toBe(frame);
            expect(frame.getAttribute("src")).toBe(src);
            expect(mocks.send).toHaveBeenLastCalledWith("protected-input:state", { disabled: state, invalid: state });
            expect(ref.current?.collect()).toBe(pending);
        }
        expect(mocks.handshakeWithChild).toHaveBeenCalledOnce();
        expect(mocks.off).not.toHaveBeenCalled();
        expect(mocks.send).not.toHaveBeenCalledWith("protected-input:reset", {});
        expect(mocks.sendAction.mock.calls[0][0].options.signal.aborted).toBe(false);
        await act(async () => complete({ result: COLLECTED }));
        await expect(pending).resolves.toEqual(COLLECTED);
    });

    test("returns a safe failure without exposing a transport exception", async () => {
        mocks.sendAction.mockRejectedValueOnce(new Error("sensitive provider details"));
        const { input } = mount();
        await expect(input.collect()).resolves.toMatchObject({
            status: "unavailable",
            code: "collector_unavailable",
        });
    });

    test("reconnects after iframe reload and supersedes the old completion", async () => {
        let complete: (value: { result: typeof COLLECTED }) => void = () => {
            throw new Error("not collecting");
        };
        mocks.sendAction.mockReturnValueOnce(
            new Promise((resolve) => {
                complete = resolve;
            })
        );
        const { input } = mount();
        const pending = input.collect();
        await act(async () => {
            await Promise.resolve();
        });
        fireEvent.load(screen.getByTitle(FIELD.label));
        complete({ result: COLLECTED });
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.off).toHaveBeenCalledWith("height-subscription");
        expect(mocks.handshakeWithChild).toHaveBeenCalledTimes(2);
    });
    test.each(["auth", "reload", "unmount"] as const)(
        "settles a pending collection immediately on %s",
        async (change) => {
            mocks.sendAction.mockReturnValueOnce(
                new Promise(() => {
                    /* The old channel never responds. */
                })
            );
            const { input, ref, rerender, unmount } = mount();
            const pending = input.collect();
            await act(async () => {
                await Promise.resolve();
            });
            const signal: AbortSignal = mocks.sendAction.mock.calls[0][0].options.signal;
            if (change === "auth") {
                rerender(<CrossmintProtectedInput ref={ref} field={FIELD} jwt="replacement-buyer" />);
            } else if (change === "reload") {
                fireEvent.load(screen.getByTitle(FIELD.label));
            } else {
                unmount();
            }
            await expect(pending).resolves.toMatchObject({ status: "superseded" });
            expect(signal.aborted).toBe(true);
            if (change !== "unmount") {
                mocks.sendAction.mockResolvedValueOnce({ result: COLLECTED });
                await expect(input.collect()).resolves.toEqual(COLLECTED);
            }
        }
    );

    test("settles collection while an iframe handshake is still pending", async () => {
        mocks.handshakeWithChild.mockReturnValueOnce(
            new Promise(() => {
                /* The old channel never responds. */
            })
        );
        const { input, unmount } = mount();
        const pending = input.collect();
        unmount();
        await expect(pending).resolves.toMatchObject({ status: "superseded" });
        expect(mocks.sendAction).not.toHaveBeenCalled();
    });
});
