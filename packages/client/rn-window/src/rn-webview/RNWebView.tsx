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

export const RNWebView = React.forwardRef<WebView, RNWebViewProps>(
  ({ globals, ...props }, ref) => {
    const safeGlobalsScript = globals ? createSafeGlobalsScript(globals) : "";

    const combinedInjectedJs = `
        ${INJECTED_BRIDGE_JS}
        ${safeGlobalsScript}
    `;

    return (
      <WebView
        ref={ref}
        {...props}
        injectedJavaScriptBeforeContentLoaded={combinedInjectedJs}
      />
    );
  }
);

RNWebView.displayName = "RNWebView";
