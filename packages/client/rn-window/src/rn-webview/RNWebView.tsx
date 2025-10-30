import * as React from "react";
import { WebView, type WebViewProps } from "react-native-webview";
import { z } from "zod";

const INJECTED_BRIDGE_JS = `
(function() {
    // Keep original console methods
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info,
        debug: console.debug,
    };

    // Function to get timestamp
    const getTimestamp = () => {
        return new Date().toISOString();
    };

    // Function to send messages to RN
    const postToRN = (type, args) => {
        try {
            // Add timestamp to the beginning of args
            const timestamp = getTimestamp();
            const timestampedArgs = ['[' + timestamp + ']'].concat(args);

            // Attempt to serialize arguments, handling potential circular references safely
            const serializedArgs = timestampedArgs.map(arg => {
                 // Basic type checking and string conversion
                if (typeof arg === 'function') {
                    return '[Function]';
                }
                if (typeof arg === 'object' && arg !== null) {
                    try {
                        // Use a replacer function to handle potential circular references
                        return JSON.stringify(arg, (key, value) => {
                            if (typeof value === 'object' && value !== null) {
                                if (seen.has(value)) {
                                    return '[Circular Reference]';
                                }
                                seen.add(value);
                            }
                            return value;
                        }, 2); // Optional: pretty print JSON
                    } catch (e) {
                        return '[Unserializable Object]';
                    } finally {
                        // Clean up seen set after stringifying each top-level argument
                        var seen = new Set(); // Use var for function scope before ES6 modules
                    }
                }
                return String(arg); // Convert primitive types to string directly
            });
             var seen = new Set(); // Declare seen here for the final stringify
            const message = JSON.stringify({ type: 'console.' + type, data: serializedArgs });
            if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
                 window.ReactNativeWebView.postMessage(message);
            } else {
                 originalConsole.warn('[Bridge] ReactNativeWebView.postMessage not available.');
            }
        } catch (e) {
            // Fallback if serialization fails completely
            originalConsole.error('[Bridge] Error posting console message to RN:', e);
        }
    };

    // Override console methods
    console.log = (...args) => {
        const timestamp = getTimestamp();
        originalConsole.log('[' + timestamp + ']', ...args); // Call original console.log with timestamp
        postToRN('log', args);
    };
    console.error = (...args) => {
        const timestamp = getTimestamp();
        originalConsole.error('[' + timestamp + ']', ...args); // Call original console.error with timestamp
        postToRN('error', args);
    };
    console.warn = (...args) => {
        const timestamp = getTimestamp();
        originalConsole.warn('[' + timestamp + ']', ...args); // Call original console.warn with timestamp
        postToRN('warn', args);
    };
    console.info = (...args) => {
        const timestamp = getTimestamp();
        originalConsole.info('[' + timestamp + ']', ...args); // Call original console.info with timestamp
        postToRN('info', args);
    };
    console.debug = (...args) => {
        const timestamp = getTimestamp();
        originalConsole.debug('[' + timestamp + ']', ...args); // Call original console.debug with timestamp
        postToRN('debug', args);
    };

    // Existing message handler from RN
    window.onMessageFromRN = function(messageStr) {
        try {
            const str = typeof messageStr === 'string' ? messageStr : JSON.stringify(messageStr);
            const message = JSON.parse(str);
            // dispatch standard MessageEvent
            window.dispatchEvent(new MessageEvent('message', { data: message }));
        } catch (e) {
            // Use the original console.error to avoid infinite loop if postToRN fails
            originalConsole.error('[Bridge] Error handling message from RN:', e);
        }
    };
})();
`;

/**
 * Allowed globals - only specific globals that are actually used in the codebase
 * This provides maximum security by restricting to known, safe values
 */
const AllowedGlobalsSchema = z
    .object({
        crossmintAppId: z.string().optional(),
    })
    .strict();
export type SafeInjectableGlobals = z.infer<typeof AllowedGlobalsSchema>;

/**
 * Safely converts allowlisted globals to JavaScript code that assigns window properties
 * This prevents code injection by only allowing known, safe globals
 */
function createSafeGlobalsScript(globals: SafeInjectableGlobals): string {
    const validatedGlobals = AllowedGlobalsSchema.parse(globals);
    const assignments = Object.entries(validatedGlobals)
        .filter(([, value]) => value != null) // Only assign defined values
        .map(([key, value]) => {
            // Safely serialize the value
            const safeValue = JSON.stringify(value);
            return `window.${key} = ${safeValue};`;
        });

    return assignments.join("\n");
}

export interface RNWebViewProps extends WebViewProps {
    globals?: SafeInjectableGlobals;
}

/**
 * Restricted ref interface that excludes injectJavaScript to prevent arbitrary code injection
 * Only exposes safe WebView methods that don't allow code injection
 */
export interface RNWebViewRef {
    /**
     * Go back one page in the webview's history.
     */
    goBack: () => void;

    /**
     * Go forward one page in the webview's history.
     */
    goForward: () => void;

    /**
     * Reloads the current page.
     */
    reload: () => void;

    /**
     * Stop loading the current page.
     */
    stopLoading: () => void;

    /**
     * Focuses on WebView rendered page.
     */
    requestFocus: () => void;

    /**
     * Posts a message to WebView.
     */
    postMessage: (message: string) => void;

    /**
     * (Android only)
     * Removes the autocomplete popup from the currently focused form field, if present.
     */
    clearFormData?: () => void;

    /**
     * Clears the resource cache. Note that the cache is per-application, so this will clear the cache for all WebViews used.
     */
    clearCache?: (includeDiskFiles: boolean) => void;

    /**
     * (Android only)
     * Tells this WebView to clear its internal back/forward list.
     */
    clearHistory?: () => void;
}

/**
 * Internal ref type that includes injectJavaScript for legitimate internal use
 * This should only be used by internal transport mechanisms, not exposed to external users
 * @internal
 */
export interface RNWebViewInternalRef extends RNWebViewRef {
    /**
     * Executes the JavaScript string.
     * @internal - Only available for internal transport mechanisms
     */
    injectJavaScript: (script: string) => void;
}

export const RNWebView = React.forwardRef<RNWebViewRef, RNWebViewProps>(({ globals, ...props }, ref) => {
    // Internal ref to the actual WebView - this is what we pass to the underlying component
    // This is kept separate from the public ref to prevent external access to injectJavaScript
    const internalRef = React.useRef<WebView>(null);

    const safeGlobalsScript = globals ? createSafeGlobalsScript(globals) : "";

    const combinedInjectedJs = `
        ${INJECTED_BRIDGE_JS}
        ${safeGlobalsScript}
    `;

    // Extract JavaScript injection props to prevent them from being passed through
    // Only our combinedInjectedJs should be injected
    const {
        injectedJavaScript,
        injectedJavaScriptBeforeContentLoaded,
        injectedJavaScriptForMainFrameOnly,
        ...restProps
    } = props;

    // Use useImperativeHandle to create a restricted ref interface
    // that excludes injectJavaScript to prevent arbitrary code injection
    React.useImperativeHandle(
        ref,
        (): RNWebViewRef => {
            const webView = internalRef.current;
            if (!webView) {
                // Return a minimal object if ref is not yet available
                // This matches the WebView interface but without injectJavaScript
                return {
                    goBack: () => {
                        // No-op when ref not available
                    },
                    goForward: () => {
                        // No-op when ref not available
                    },
                    reload: () => {
                        // No-op when ref not available
                    },
                    stopLoading: () => {
                        // No-op when ref not available
                    },
                    requestFocus: () => {
                        // No-op when ref not available
                    },
                    postMessage: () => {
                        // No-op when ref not available
                    },
                    clearFormData: () => {
                        // No-op when ref not available
                    },
                    clearCache: () => {
                        // No-op when ref not available
                    },
                    clearHistory: () => {
                        // No-op when ref not available
                    },
                };
            }

            // Explicitly return only the safe methods, excluding injectJavaScript
            return {
                goBack: webView.goBack,
                goForward: webView.goForward,
                reload: webView.reload,
                stopLoading: webView.stopLoading,
                requestFocus: webView.requestFocus,
                postMessage: webView.postMessage,
                clearFormData: webView.clearFormData,
                clearCache: webView.clearCache,
                clearHistory: webView.clearHistory,
            };
        },
        []
    );

    return (
        <WebView
            ref={internalRef}
            {...restProps}
            injectedJavaScriptBeforeContentLoaded={combinedInjectedJs}
            injectedJavaScript={undefined}
            injectedJavaScriptForMainFrameOnly={undefined}
        />
    );
});

RNWebView.displayName = "RNWebView";
