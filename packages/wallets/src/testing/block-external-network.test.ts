import net from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { installNetworkKillSwitch } from "./block-external-network";

describe("installNetworkKillSwitch", () => {
    let uninstall: (() => void) | undefined;

    afterEach(() => {
        uninstall?.();
        uninstall = undefined;
    });

    it("blocks a non-allowed host synchronously, not as a hang or timeout", () => {
        uninstall = installNetworkKillSwitch();

        const start = Date.now();
        expect(() => new net.Socket().connect(443, "staging.crossmint.com")).toThrow(
            /Blocked outbound connection to "staging\.crossmint\.com:443"/
        );
        expect(Date.now() - start).toBeLessThan(50);
    });

    it("surfaces the same blocked-host error through fetch, quickly, instead of a network timeout", async () => {
        uninstall = installNetworkKillSwitch();

        const start = Date.now();
        await expect(fetch("http://staging.crossmint.com/")).rejects.toThrow();
        expect(Date.now() - start).toBeLessThan(1000);
    });

    it("still allows loopback connections, so the sandbox's own dev server keeps working", () => {
        uninstall = installNetworkKillSwitch();

        // No listening server on these ports — only proving the kill-switch itself doesn't
        // reject synchronously; the resulting ECONNREFUSED is expected and swallowed.
        expect(() => new net.Socket().on("error", () => undefined).connect(1, "127.0.0.1")).not.toThrow();
        expect(() => new net.Socket().on("error", () => undefined).connect(1, "localhost")).not.toThrow();
    });

    it("allows an explicitly allowlisted host through, for suites that need real network", () => {
        // "allowed.invalid" is reserved by RFC 2606 to never resolve, keeping this test hermetic
        // and fast — it only needs to prove the kill-switch doesn't reject synchronously.
        uninstall = installNetworkKillSwitch({ allowedHosts: ["allowed.invalid"] });

        expect(() => new net.Socket().on("error", () => undefined).connect(443, "allowed.invalid")).not.toThrow();
        expect(() => new net.Socket().connect(443, "staging.crossmint.com")).toThrow(/Blocked outbound connection/);
    });

    it("restores the original connect behavior once uninstalled", () => {
        const originalConnect = net.Socket.prototype.connect;
        uninstall = installNetworkKillSwitch();
        expect(net.Socket.prototype.connect).not.toBe(originalConnect);

        uninstall();
        uninstall = undefined;

        expect(net.Socket.prototype.connect).toBe(originalConnect);
    });
});
