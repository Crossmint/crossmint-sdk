import { afterEach, describe, expect, it, vi } from "vitest";
import { hasPartitionedStorage } from "./storage-partitioning";

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

    describe("embedded Chromium runtimes without partitioning", () => {
        it("returns false for Android WebView despite a recent Chrome token", () => {
            setUserAgent(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240205.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns false for the Facebook in-app browser on Android", () => {
            setUserAgent(
                "Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/450.0.0.35.108;]"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns false for the Instagram in-app browser on Android", () => {
            setUserAgent(
                "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/138.0.0.0 Mobile Safari/537.36 Instagram 320.0.0.42.101 Android"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns false for Electron", () => {
            setUserAgent(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) MyApp/1.0 Chrome/128.0.0.0 Electron/32.0.0 Safari/537.36"
            );
            expect(hasPartitionedStorage()).toBe(false);
        });

        it("returns true for Chrome on Android, which is not a WebView", () => {
            setUserAgent(
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36"
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
