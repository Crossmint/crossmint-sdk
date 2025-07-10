import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { WebView } from "react-native-webview";
import { RNWebView } from "./RNWebView";

// Mock react-native-webview
vi.mock("react-native-webview", () => ({
    WebView: vi.fn().mockImplementation((props) => {
        const injectedJs = props.injectedJavaScriptBeforeContentLoaded;
        return React.createElement("div", {
            "data-testid": "mock-webview",
            "data-injected-js": injectedJs,
            ...props,
        });
    }),
}));

describe("RNWebView Security", () => {
    it("should inject valid crossmintAppId global", () => {
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: "test-app-id" }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        expect(injectedJs).toContain('window.crossmintAppId = "test-app-id";');
    });

    it("should work without globals", () => {
        const { getByTestId } = render(<RNWebView source={{ uri: "https://example.com" }} />);

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        expect(injectedJs).not.toContain("window.crossmintAppId");
        expect(injectedJs).toContain("window.onMessageFromRN"); // Bridge JS still present
    });

    it("should prevent XSS attacks in crossmintAppId", () => {
        const xssPayload = 'evil"; alert("XSS"); window.location="http://evil.com"; //';
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: xssPayload }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");

        // Should be safely JSON-encoded, NOT executed as code
        expect(injectedJs).toContain(
            'window.crossmintAppId = "evil\\"; alert(\\"XSS\\"); window.location=\\"http://evil.com\\"; //";'
        );

        // Should NOT contain unescaped malicious code
        expect(injectedJs).not.toContain('evil"; alert("XSS");');
        expect(injectedJs).not.toContain('window.location="http://evil.com"');
    });

    it("should reject unknown properties", () => {
        const maliciousGlobals = {
            crossmintAppId: "valid-id",
            evilScript: "alert('pwned')", // Should be rejected
        };

        expect(() => {
            render(<RNWebView source={{ uri: "https://example.com" }} globals={maliciousGlobals as any} />);
        }).toThrow(/Unrecognized key/);
    });

    it("should reject invalid data types", () => {
        const invalidGlobals = {
            crossmintAppId: { malicious: "object" }, // Should be string
        };

        expect(() => {
            render(<RNWebView source={{ uri: "https://example.com" }} globals={invalidGlobals as any} />);
        }).toThrow(/Expected string/);
    });

    it("should properly escape special characters", () => {
        const { getByTestId } = render(
            <RNWebView
                source={{ uri: "https://example.com" }}
                globals={{ crossmintAppId: "test\"id'with\\special\nchars" }}
            />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        expect(injectedJs).toContain('window.crossmintAppId = "test\\"id\'with\\\\special\\nchars";');
    });

    it("should pass through WebView props", () => {
        render(
            <RNWebView
                source={{ uri: "https://example.com" }}
                globals={{ crossmintAppId: "test" }}
                style={{ width: 100 }}
            />
        );

        expect(WebView).toHaveBeenCalledWith(
            expect.objectContaining({
                source: { uri: "https://example.com" },
                style: { width: 100 },
                injectedJavaScriptBeforeContentLoaded: expect.stringContaining('window.crossmintAppId = "test";'),
            }),
            expect.any(Object)
        );
    });
});
