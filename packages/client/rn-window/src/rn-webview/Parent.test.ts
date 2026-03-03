import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("react-native", () => ({}));
vi.mock("react-native-webview", () => ({ WebView: vi.fn() }));
vi.mock("react-native-get-random-values", () => ({}));

// Must import after mocks
const { WebViewParent } = await import("./Parent");

function createMockWebViewRef() {
    return {
        current: {
            injectJavaScript: vi.fn(),
            reload: vi.fn(),
        },
    } as any;
}

function getEventEmitterProto(parent: InstanceType<typeof WebViewParent>) {
    return Object.getPrototypeOf(Object.getPrototypeOf(parent));
}

describe("WebViewParent.sendAction", () => {
    let webviewRef: ReturnType<typeof createMockWebViewRef>;

    beforeEach(() => {
        webviewRef = createMockWebViewRef();
        vi.restoreAllMocks();
    });

    it("should call handshakeWithChild when not connected before sendAction", async () => {
        const parent = new WebViewParent(webviewRef, {
            incomingEvents: {} as any,
            outgoingEvents: {} as any,
        });

        expect(parent.isConnected).toBe(false);

        const handshakeSpy = vi.spyOn(parent, "handshakeWithChild").mockImplementation(async () => {
            parent.isConnected = true;
        });

        vi.spyOn(getEventEmitterProto(parent), "sendAction").mockResolvedValue({ status: "success" });

        const result = await parent.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {},
        } as any);

        expect(handshakeSpy).toHaveBeenCalled();
        expect(result).toEqual({ status: "success" });
    });

    it("should reload and retry exactly once on sendAction timeout", async () => {
        const parent = new WebViewParent(webviewRef, {
            incomingEvents: {} as any,
            outgoingEvents: {} as any,
        });
        parent.isConnected = true;

        let callCount = 0;
        vi.spyOn(getEventEmitterProto(parent), "sendAction").mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                throw "Timed out waiting for response:get-status event after 30s";
            }
            return { status: "success" };
        });

        vi.spyOn(parent, "handshakeWithChild").mockImplementation(async () => {
            parent.isConnected = true;
        });

        const result = await parent.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {},
        } as any);

        expect(callCount).toBe(2);
        expect(webviewRef.current.reload).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ status: "success" });
    });

    it("should propagate non-timeout errors without retry", async () => {
        const parent = new WebViewParent(webviewRef, {
            incomingEvents: {} as any,
            outgoingEvents: {} as any,
        });
        parent.isConnected = true;

        vi.spyOn(getEventEmitterProto(parent), "sendAction").mockRejectedValue(new Error("Some other error"));

        await expect(
            parent.sendAction({
                event: "request:get-status",
                responseEvent: "response:get-status",
                data: {},
            } as any)
        ).rejects.toThrow("Some other error");

        expect(webviewRef.current.reload).not.toHaveBeenCalled();
    });

    it("should not double-retry when recoverable error retry itself times out", async () => {
        const parent = new WebViewParent(webviewRef, {
            incomingEvents: {} as any,
            outgoingEvents: {} as any,
            recovery: {
                recoverableErrorCodes: ["indexeddb-fatal"],
            },
        });
        parent.isConnected = true;

        let callCount = 0;
        vi.spyOn(getEventEmitterProto(parent), "sendAction").mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                return { status: "error", code: "indexeddb-fatal" };
            }
            if (callCount === 2) {
                throw "Timed out waiting for response:get-status event after 30s";
            }
            return { status: "success" };
        });

        vi.spyOn(parent, "handshakeWithChild").mockImplementation(async () => {
            parent.isConnected = true;
        });

        // The timeout from the recoverable-error retry should propagate (not trigger another retry)
        await expect(
            parent.sendAction({
                event: "request:get-status",
                responseEvent: "response:get-status",
                data: {},
            } as any)
        ).rejects.toBe("Timed out waiting for response:get-status event after 30s");

        expect(callCount).toBe(2);
        expect(webviewRef.current.reload).toHaveBeenCalledTimes(1);
    });

    it("should retry on recoverable error code", async () => {
        const parent = new WebViewParent(webviewRef, {
            incomingEvents: {} as any,
            outgoingEvents: {} as any,
            recovery: {
                recoverableErrorCodes: ["indexeddb-fatal"],
            },
        });
        parent.isConnected = true;

        let callCount = 0;
        vi.spyOn(getEventEmitterProto(parent), "sendAction").mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
                return { status: "error", code: "indexeddb-fatal" };
            }
            return { status: "success" };
        });

        vi.spyOn(parent, "handshakeWithChild").mockImplementation(async () => {
            parent.isConnected = true;
        });

        const result = await parent.sendAction({
            event: "request:get-status",
            responseEvent: "response:get-status",
            data: {},
        } as any);

        expect(result).toEqual({ status: "success" });
        expect(callCount).toBe(2);
        expect(webviewRef.current.reload).toHaveBeenCalledTimes(1);
    });
});
