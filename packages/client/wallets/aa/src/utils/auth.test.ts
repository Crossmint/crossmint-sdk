import { parseToken } from "./auth";

describe("parseToken", () => {
    let originalAtob: typeof window.atob | undefined;
    let originalConsoleError: any;

    beforeAll(() => {
        // Check if atob needs to be mocked (Node environment)
        if (typeof window === "undefined") {
            global.window = {} as any;
            (window as any).atob = jest.fn((str) => Buffer.from(str, "base64").toString("binary"));
        } else {
            // Save the original atob function
            originalAtob = window.atob;
            window.atob = jest.fn((str) => Buffer.from(str, "base64").toString("binary"));
        }
        originalConsoleError = console.error;
        console.error = jest.fn();
    });

    afterAll(() => {
        // Restore the original atob function
        if (originalAtob) {
            (window as any).atob = originalAtob;
        } else {
            delete (global as any).window;
        }
        console.error = originalConsoleError;
    });

    it("correctly parses a valid token", () => {
        const sampleToken =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
        const expectedPayload = {
            sub: "1234567890",
            name: "John Doe",
            iat: 1516239022,
        };

        const result = parseToken(sampleToken);
        expect(result).toEqual(expectedPayload);
    });

    it("throws an error for an invalid token", () => {
        const invalidToken = "invalid.token";

        expect(() => parseToken(invalidToken)).toThrow();
    });
});
