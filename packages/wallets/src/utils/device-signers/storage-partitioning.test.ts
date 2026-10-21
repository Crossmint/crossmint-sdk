import { afterEach, describe, expect, it, vi } from "vitest";
import { hasEphemeralThirdPartyStorage, hasPartitionedStorage } from "./storage-partitioning";

function setUserAgent(ua: string): void {
    vi.stubGlobal("navigator", { userAgent: ua });
}

describe("hasPartitionedStorage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("Chromium-based browsers", () => {
        it("returns false for Chrome < 115", () => {
            setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns true for Chrome 115 (exact boundary)", () => {
            setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
            );
            expect(hasPartitionedStorage()).toBe(true);
        });

        it("returns true for Chrome > 115", () => {
            setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            );
            expect(hasPartitionedStorage()).toBe(true);
        });

        it("returns true for Edge (Chromium-based, version >= 115)", () => {
            setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0"
            );
            expect(hasPartitionedStorage()).toBe(true);
        });

        it("returns false for Edge (Chromium-based, version < 115)", () => {
            setUserAgent(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36 Edg/110.0.0.0"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });
    });

    describe("Firefox", () => {
        it("returns false for Firefox < 103", () => {
            setUserAgent("Mozilla/5.0 (Windows NT 10.0; rv:102.0) Gecko/20100101 Firefox/102.0");
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns true for Firefox 103 (exact boundary)", () => {
            setUserAgent("Mozilla/5.0 (Windows NT 10.0; rv:103.0) Gecko/20100101 Firefox/103.0");
            expect(hasPartitionedStorage()).toBe(true);
        });

        it("returns true for Firefox > 103", () => {
            setUserAgent("Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0");
            expect(hasPartitionedStorage()).toBe(true);
        });
    });

    describe("Safari", () => {
        it("returns true for Safari", () => {
            setUserAgent(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15"
            );
            expect(hasPartitionedStorage()).toBe(true);
        });
    });

    describe("edge cases", () => {
        it("returns false for unknown user agent", () => {
            setUserAgent("SomeCustomBot/1.0");
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns false for empty user agent", () => {
            setUserAgent("");
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns false when navigator is undefined", () => {
            vi.stubGlobal("navigator", undefined);
            expect(hasPartitionedStorage()).toBe(false);
        });
    });
});

describe("hasEphemeralThirdPartyStorage", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it.each([
        [
            "iOS Safari",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Mobile/15E148 Safari/604.1",
            true,
        ],
        [
            "iOS Chrome",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
            true,
        ],
        [
            "macOS Safari",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.7 Safari/605.1.15",
            true,
        ],
        [
            "macOS Chrome",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            false,
        ],
        [
            "Android Chrome",
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
            false,
        ],
        ["desktop Firefox", "Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0", false],
    ])("%s returns %s", (_name, ua, expected) => {
        setUserAgent(ua);
        expect(hasEphemeralThirdPartyStorage()).toBe(expected);
    });

    it("returns true for Brave, which reports a Chrome user agent", () => {
        vi.stubGlobal("navigator", {
            userAgent:
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
            brave: {},
        });
        expect(hasEphemeralThirdPartyStorage()).toBe(true);
    });
});
