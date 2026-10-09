import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SandboxNcsConnection } from "./ncs-handshake-sandbox";

const AUTH_DATA = { authData: { jwt: "jwt", apiKey: "key" } };

async function connectAndHandshake(sandbox: SandboxNcsConnection) {
    const connection = sandbox.createConnection();
    const handshakePromise = connection.handshakeWithChild();
    await vi.advanceTimersByTimeAsync(0);
    await handshakePromise;
    return connection;
}

describe("SandboxNcsConnection", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("does not keep retrying after the handshake succeeds", async () => {
        vi.useRealTimers();

        const sandbox = new SandboxNcsConnection();
        const connection = sandbox.createConnection();
        const sendSpy = vi.spyOn(connection, "send");

        await connection.handshakeWithChild();
        const requestsAtSuccess = sendSpy.mock.calls.filter(([event]) => event === "handshakeRequest").length;

        await new Promise((resolve) => setTimeout(resolve, 250));

        const requestsAfterWaiting = sendSpy.mock.calls.filter(([event]) => event === "handshakeRequest").length;
        expect(requestsAfterWaiting).toBe(requestsAtSuccess);
    });

    it("completes the handshake and reports ready via get-status", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);
        expect(connection.isConnected).toBe(true);

        const statusPromise = connection.sendAction({
            event: "request:get-status",
            data: AUTH_DATA,
            responseEvent: "response:get-status",
        });
        await vi.advanceTimersByTimeAsync(0);

        await expect(statusPromise).resolves.toMatchObject({ status: "success", signerStatus: "ready" });
    });

    it("handshake-timed-out: the transport never sends handshakeResponse", async () => {
        const sandbox = new SandboxNcsConnection();
        sandbox.setFailure("handshake-timed-out");
        const connection = sandbox.createConnection();

        const handshakePromise = connection.handshakeWithChild();
        const assertion = expect(handshakePromise).rejects.toMatch(/timed out/i);
        await vi.advanceTimersByTimeAsync(30_000);
        await assertion;
        expect(connection.isConnected).toBe(false);
    });

    it("ready-never-sent: get-status never replies after a successful handshake", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);

        sandbox.setFailure("ready-never-sent");
        const statusPromise = connection.sendAction({
            event: "request:get-status",
            data: AUTH_DATA,
            responseEvent: "response:get-status",
            options: { timeoutMs: 7000 },
        });
        const assertion = expect(statusPromise).rejects.toMatch(/timed out/i);
        await vi.advanceTimersByTimeAsync(7000);
        await assertion;
    });

    it("attestation-rejected: get-status reports an explicit rejection instead of ready", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);

        sandbox.setFailure("attestation-rejected");
        const statusPromise = connection.sendAction({
            event: "request:get-status",
            data: AUTH_DATA,
            responseEvent: "response:get-status",
        });
        await vi.advanceTimersByTimeAsync(0);

        await expect(statusPromise).resolves.toMatchObject({ status: "error", code: "ATTESTATION_REJECTED" });
    });

    it("completes onboarding end to end: start-onboarding then complete-onboarding both succeed", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);

        const startPromise = connection.sendAction({
            event: "request:start-onboarding",
            data: { ...AUTH_DATA, data: { authId: "auth-1" } },
            responseEvent: "response:start-onboarding",
        });
        await vi.advanceTimersByTimeAsync(0);
        await expect(startPromise).resolves.toMatchObject({ status: "success", signerStatus: "ready" });

        const completePromise = connection.sendAction({
            event: "request:complete-onboarding",
            data: { ...AUTH_DATA, data: { onboardingAuthentication: { encryptedOtp: "encrypted-otp" } } },
            responseEvent: "response:complete-onboarding",
        });
        await vi.advanceTimersByTimeAsync(0);

        await expect(completePromise).resolves.toMatchObject({ status: "success", signerStatus: "ready" });
    });

    it("storage-unavailable: onboarding fails even though the connection is healthy", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);

        sandbox.setFailure("storage-unavailable");
        const onboardingPromise = connection.sendAction({
            event: "request:start-onboarding",
            data: { ...AUTH_DATA, data: { authId: "auth-1" } },
            responseEvent: "response:start-onboarding",
        });
        await vi.advanceTimersByTimeAsync(0);

        await expect(onboardingPromise).resolves.toMatchObject({
            status: "error",
            error: expect.stringMatching(/storage/i),
        });
    });

    it("frame torn down mid-session: a request made after teardown never gets a reply", async () => {
        const sandbox = new SandboxNcsConnection();
        const connection = await connectAndHandshake(sandbox);

        sandbox.tearDownFrame();
        const statusPromise = connection.sendAction({
            event: "request:get-status",
            data: AUTH_DATA,
            responseEvent: "response:get-status",
            options: { timeoutMs: 7000 },
        });
        const assertion = expect(statusPromise).rejects.toMatch(/timed out/i);
        await vi.advanceTimersByTimeAsync(7000);
        await assertion;
    });
});
