import { beforeEach, describe, expect, test } from "vitest";

import { waitForSettledState } from "../testUtils";
import { deleteCookie, getCookie, setCookie } from "./authCookies";

describe("authCookies", () => {
    beforeEach(() => {
        // Clear all cookies before each test
        document.cookie.split(";").forEach((cookie) => {
            document.cookie = cookie
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
    });

    test("should return undefined for non-existent cookie", () => {
        expect(getCookie("non-existent")).toBeUndefined();
    });

    test("should return the correct value for an existing cookie", async () => {
        document.cookie = "test-cookie=test-value";
        await waitForSettledState(() => {
            expect(getCookie("test-cookie")).toBe("test-value");
        });
    });

    test("should set a cookie without expiration", async () => {
        setCookie("test-cookie", "test-value");
        await waitForSettledState(() => {
            expect(document.cookie).toContain("test-cookie=test-value");
        });
    });

    test("should delete an existing cookie", async () => {
        document.cookie = "test-cookie=test-value";
        deleteCookie("test-cookie");
        await waitForSettledState(() => {
            expect(document.cookie).not.toContain("test-cookie");
        });
    });
});
