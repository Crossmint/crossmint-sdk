import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CookieStorage, type StorageProvider } from "./storage";

describe("CookieStorage", () => {
    let storage: StorageProvider;
    let documentCookieSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        storage = new CookieStorage();
        documentCookieSpy = vi.spyOn(document, "cookie", "get");
        Object.defineProperty(document, "cookie", {
            writable: true,
            value: "",
        });
    });

    afterEach(() => {
        documentCookieSpy.mockRestore();
    });

    it("gets a value from cookie", async () => {
        document.cookie = "test_key=test_value; path=/; SameSite=Lax;";
        expect(await storage.get("test_key")).toBe("test_value");
    });

    it("returns undefined for non-existent cookie", async () => {
        document.cookie = "";
        expect(await storage.get("test_key")).toBeUndefined();
    });

    it("sets a cookie without expiration", async () => {
        await storage.set("test_key", "test_value");
        expect(document.cookie).toBe("test_key=test_value;  path=/; SameSite=Lax;");
    });

    it("sets a cookie with expiration", async () => {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 1);
        const expiresAt = futureDate.toISOString();

        await storage.set("test_key", "test_value", expiresAt);
        expect(document.cookie).toContain("test_key=test_value;");
        expect(document.cookie).toContain("expires=");
        expect(document.cookie).toContain("path=/; SameSite=Lax;");
    });

    it("removes a cookie", async () => {
        document.cookie = "test_key=test_value; path=/; SameSite=Lax;";
        await storage.remove("test_key");
        // When a cookie is removed, it's set with an expiration in the past
        expect(document.cookie).toContain("test_key=");
        expect(document.cookie).toContain("expires=Thu, 01 Jan 1970 00:00:00 UTC");
    });
});
