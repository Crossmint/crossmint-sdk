import { isProduction } from "./utils";

describe("isProduction", () => {
    it("returns true for production environments", () => {
        const prod = isProduction("prod");
        expect(prod).toBe(true);
    });

    it("returns true for production environment: https://www.crossmint.com/api", () => {
        const prod = isProduction("https://www.crossmint.com/api");
        expect(prod).toBe(true);
    });

    it("returns false for non-production environments", () => {
        const prod = isProduction("dev");
        expect(prod).toBe(false);
    });
});
