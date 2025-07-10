import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render } from "@testing-library/react";
import { WebView } from "react-native-webview";
import { RNWebView } from "./RNWebView";

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
        expect(injectedJs).toContain("window.onMessageFromRN"); // Bridge still functional
    });

    it("should prevent script injection via crossmintAppId", () => {
        // Classic XSS: Break out of string context and execute malicious code
        const scriptInjectionAttack = '"; alert("XSS"); window.location="http://evil.com"; //';
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: scriptInjectionAttack }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");

        // Attack payload should be safely JSON-escaped, not executed
        expect(injectedJs).toContain(
            'window.crossmintAppId = "\\"; alert(\\"XSS\\"); window.location=\\"http://evil.com\\"; //";'
        );
        // Verify dangerous code patterns are neutralized
        expect(injectedJs).not.toContain('"; alert("XSS");');
        expect(injectedJs).not.toContain('window.location="http://evil.com"');
    });

    it("should prevent HTML/JS injection attacks", () => {
        // HTML context breaking + event handler injection
        const htmlJsInjectionAttack = '</script><img src=x onerror=alert("XSS")><script>';
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: htmlJsInjectionAttack }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        // HTML tags should be treated as literal string content
        expect(injectedJs).toContain(
            'window.crossmintAppId = "</script><img src=x onerror=alert(\\"XSS\\")><script>";'
        );
        expect(injectedJs).not.toContain('<img src=x onerror=alert("XSS")>');
    });

    it("should prevent function call injection", () => {
        // Attempt to break string context and call eval()
        const functionCallAttack = '"; eval("malicious code"); console.log("';
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: functionCallAttack }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        // eval() should be neutralized as string content
        expect(injectedJs).toContain('window.crossmintAppId = "\\"; eval(\\"malicious code\\"); console.log(\\"";');
        expect(injectedJs).not.toContain('eval("malicious code")');
    });

    it("should reject malicious additional properties", () => {
        // Prototype pollution + extra property injection attempts
        const maliciousPayload = {
            crossmintAppId: "valid-id",
            __proto__: { evil: "payload" },
            constructor: { malicious: "code" },
            evilScript: "alert('pwned')",
        };

        // Zod strict validation should reject any unknown properties
        expect(() => {
            render(<RNWebView source={{ uri: "https://example.com" }} globals={maliciousPayload as any} />);
        }).toThrow(/Unrecognized key/);
    });

    it("should reject object/function injection attempts", () => {
        // Object with malicious toString() method
        const objectInjectionAttack = {
            crossmintAppId: { toString: () => "alert('XSS')" },
        };

        // Type validation should only allow string primitives
        expect(() => {
            render(<RNWebView source={{ uri: "https://example.com" }} globals={objectInjectionAttack as any} />);
        }).toThrow(/Expected string/);
    });

    it("should safely escape all dangerous characters", () => {
        // Common special characters used in injection attacks
        const dangerousChars = "quotes\"and'backslashes\\and\nnewlines\rand\ttabs";
        const { getByTestId } = render(
            <RNWebView source={{ uri: "https://example.com" }} globals={{ crossmintAppId: dangerousChars }} />
        );

        const injectedJs = getByTestId("mock-webview").getAttribute("data-injected-js");
        // All special characters should be properly JSON-escaped
        expect(injectedJs).toContain(
            'window.crossmintAppId = "quotes\\"and\'backslashes\\\\and\\nnewlines\\rand\\ttabs";'
        );
    });

    it("should pass through WebView props correctly", () => {
        render(
            <RNWebView
                source={{ uri: "https://example.com" }}
                globals={{ crossmintAppId: "test" }}
                style={{ width: 100 }}
            />
        );

        // Component should maintain all WebView functionality
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
