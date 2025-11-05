import type { EventMap, EventEmitterWithHandshakeOptions, SendActionArgs } from "@crossmint/client-sdk-window";
import { HandshakeParent } from "@crossmint/client-sdk-window";
import type { RefObject } from "react";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import type { z } from "zod";
import { RNWebViewTransport } from "../transport/RNWebViewTransport";

/**
 * Error response type from signer operations
 */
type ErrorResponse = { status: "error"; code?: string; error?: string };

/**
 * Recovery options for handling fatal errors in WebView operations.
 * When enabled, WebViewParent will automatically reload the WebView and retry operations
 * when specific error codes are encountered.
 */
export interface RecoveryOptions {
    /**
     * Array of error codes that should trigger WebView reload and retry.
     * Example: ["indexeddb-fatal"]
     */
    recoverableErrorCodes: string[];

    /**
     * Minimum timeout in milliseconds to apply on retry attempts.
     * This ensures enough time for WebView reload + handshake completion.
     * Default: 10000 (10 seconds)
     */
    retryTimeoutFloorMs?: number;
}

export interface WebViewParentOptions<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>
    extends EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents> {
    /**
     * Optional recovery configuration for automatic WebView reload and retry on fatal errors.
     * When not provided, no automatic recovery is performed (backward compatible).
     */
    recovery?: RecoveryOptions;
}

export class WebViewParent<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    protected transport: RNWebViewTransport<OutgoingEvents>;
    private recoveryOptions?: RecoveryOptions;
    private _reconnectFlight?: Promise<void>;

    /**
     * @param webviewRef A React ref to the WebView component
     * @param options Optional EventEmitter, handshake, and recovery options
     */
    constructor(webviewRef: RefObject<WebView | null>, options?: WebViewParentOptions<IncomingEvents, OutgoingEvents>) {
        const transport = new RNWebViewTransport<OutgoingEvents>(webviewRef);
        super(transport, options);
        this.transport = transport;
        this.recoveryOptions = options?.recovery;
    }

    /**
     * Should be passed to the React Native WebView's onMessage prop to forward events into the transport
     */
    public handleMessage = (event: WebViewMessageEvent): void => {
        console.log("[WebViewParent] handleMessage() called");
        if (this.transport instanceof RNWebViewTransport) {
            this.transport.handleMessage(event);
        } else {
            console.error("[WebViewParent] Transport is not an instance of RNWebViewTransport");
        }
    };

    /**
     * Reloads the WebView and re-establishes handshake.
     * Uses single-flight pattern to prevent concurrent reloads.
     */
    private async reloadAndHandshake(): Promise<void> {
        if (!this._reconnectFlight) {
            this._reconnectFlight = (async () => {
                try {
                    console.log("[WebViewParent] Starting WebView reload and handshake");
                    this.isConnected = false;
                    this.transport.reload();
                    await this.handshakeWithChild();
                    console.log("[WebViewParent] WebView reload and handshake completed");
                } finally {
                    this._reconnectFlight = undefined;
                }
            })();
        }
        return this._reconnectFlight;
    }

    /**
     * Checks if a response is an error response with a recoverable error code.
     */
    private isRecoverableError(response: unknown): response is ErrorResponse {
        if (!this.recoveryOptions) {
            return false;
        }

        return (
            response != null &&
            typeof response === "object" &&
            "status" in response &&
            response.status === "error" &&
            "code" in response &&
            typeof response.code === "string" &&
            this.recoveryOptions.recoverableErrorCodes.includes(response.code)
        );
    }

    /**
     * Override sendAction to add automatic recovery for fatal errors.
     * When a recoverable error is detected, reloads WebView and retries once with extended timeout.
     */
    public override async sendAction<K extends keyof OutgoingEvents, R extends keyof IncomingEvents>(
        args: SendActionArgs<IncomingEvents, OutgoingEvents, K, R>
    ): Promise<z.infer<IncomingEvents[R]>> {
        const response = await super.sendAction(args);

        if (this.isRecoverableError(response)) {
            console.log(
                `[WebViewParent] Recoverable error detected (code: ${response.code}), reloading WebView and retrying`
            );

            await this.reloadAndHandshake();

            const originalTimeout = args.options?.timeoutMs ?? 0;
            const retryTimeoutFloorMs = this.recoveryOptions?.retryTimeoutFloorMs ?? 10000;
            const retryTimeout = Math.max(originalTimeout, retryTimeoutFloorMs);

            const retryArgs = {
                ...args,
                options: { ...(args.options ?? {}), timeoutMs: retryTimeout },
            };

            console.log(`[WebViewParent] Retrying operation with timeout: ${retryTimeout}ms`);
            return await super.sendAction(retryArgs);
        }

        return response;
    }
}
