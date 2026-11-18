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

        expect(() => new net.Socket().connect(443, "staging.crossmint.com")).toThrow(
            /Blocked outbound connection to "staging\.crossmint\.com:443"/
        );
    });

    it.each([
        ["net.connect", () => net.connect(80, "staging.crossmint.com")],
        ["net.createConnection", () => net.createConnection({ port: 80, host: "staging.crossmint.com" })],
    ])("blocks a non-allowed host reached through %s", (_, connect) => {
        uninstall = installNetworkKillSwitch();

        expect(connect).toThrow(/Blocked outbound connection to "staging\.crossmint\.com:80"/);
    });

    it("surfaces the same blocked-host error through a plain-http fetch, instead of a network timeout", async () => {
        uninstall = installNetworkKillSwitch();

        const rejection: unknown = await fetch("http://staging.crossmint.com/", { redirect: "manual" }).catch(
            (error) => error
        );
        expect((rejection as { cause?: Error }).cause?.message).toMatch(/Blocked outbound connection/);
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
