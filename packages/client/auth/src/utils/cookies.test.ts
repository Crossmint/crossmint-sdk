import { beforeEach, describe, expect, it } from "vitest";
import { deleteCookie, getCookie, setCookie } from "./cookies";

describe("cookies", () => {
    beforeEach(() => {
        // Clear all cookies before each test
        document.cookie.split(";").forEach((cookie) => {
            document.cookie = cookie
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    });

    it("should return undefined for non-existent cookie", () => {
        expect(getCookie("non-existent")).toBeUndefined();
    });

    it("should return the correct value for an existing cookie", async () => {
        document.cookie = "test-cookie=test-value";
        await waitForSettledState(() => {
            expect(getCookie("test-cookie")).toBe("test-value");
        });
    });

    it("should set a cookie without expiration", async () => {
        setCookie("test-cookie", "test-value");
        await waitForSettledState(() => {
            expect(document.cookie).toContain("test-cookie=test-value");
        });
    });

    it("should delete an existing cookie", async () => {
        document.cookie = "test-cookie=test-value";
        deleteCookie("test-cookie");
        await waitForSettledState(() => {
            expect(document.cookie).not.toContain("test-cookie");
        });
    });
});

const waitForSettledState = async (callback: () => void) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    callback();
};
