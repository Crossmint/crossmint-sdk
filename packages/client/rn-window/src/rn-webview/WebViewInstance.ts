import type { WebView } from "react-native-webview";

/**
 * The type of a WebView ref.
 *
 * react-native-webview 14.0.1 declares `class WebView<P = undefined>`, and TypeScript reduces
 * `WebViewProps & undefined` to `never`, so the bare `WebView` type rejects every prop. Passing
 * `object` keeps the props intact on react-native-webview 13 and 14.
 */
export type WebViewInstance = WebView<object>;
