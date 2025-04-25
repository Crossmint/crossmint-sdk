import * as React from "react";
import { WebView, type WebViewProps } from "react-native-webview";

const INJECTED_BRIDGE_JS = `
(function() {
    window.onMessageFromRN = function(messageStr) {
        try {
            const str = typeof messageStr === 'string' ? messageStr : JSON.stringify(messageStr);
            const message = JSON.parse(str);
            // dispatch standard MessageEvent
            window.dispatchEvent(new MessageEvent('message', { data: message }));
        } catch (e) {
            console.error('[Bridge] Error handling message from RN:', e);
        }
    };
})();
`;

export const RNWebView = React.forwardRef<WebView, WebViewProps>((props, ref) => {
    return <WebView ref={ref} {...props} injectedJavaScriptBeforeContentLoaded={INJECTED_BRIDGE_JS} />;
});

RNWebView.displayName = "RNWebView";
