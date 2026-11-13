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
        const rejection: unknown = await fetch("http://staging.crossmint.com/").catch((error) => error);
        expect((rejection as { cause?: Error }).cause?.message).toMatch(/Blocked outbound connection/);
        expect(Date.now() - start).toBeLessThan(5000);
    });

    it("still allows loopback connections, so the sandbox's own dev server keeps working", () => {
        uninstall = installNetworkKillSwitch();

        expect(() => new net.Socket().on("error", () => undefined).connect(1, "127.0.0.1")).not.toThrow();
        expect(() => new net.Socket().on("error", () => undefined).connect(1, "localhost")).not.toThrow();
    });

    it("allows an explicitly allowlisted host through, for suites that need real network", () => {
        uninstall = installNetworkKillSwitch({ allowedHosts: ["allowed.invalid"] });

        expect(() => new net.Socket().on("error", () => undefined).connect(443, "allowed.invalid")).not.toThrow();
        expect(() => new net.Socket().connect(443, "staging.crossmint.com")).toThrow(/Blocked outbound connection/);
    });

    it("restores the previous allowlist once uninstalled, rather than removing protection entirely", () => {
        uninstall = installNetworkKillSwitch({ allowedHosts: ["allowed.invalid"] });
        expect(() => new net.Socket().on("error", () => undefined).connect(443, "allowed.invalid")).not.toThrow();

        uninstall();
        uninstall = undefined;

        expect(() => new net.Socket().connect(443, "allowed.invalid")).toThrow(/Blocked outbound connection/);
    });
});
