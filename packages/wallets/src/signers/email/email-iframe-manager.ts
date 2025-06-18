import { IFrameWindow, type HandshakeParent } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

export type IframeConfig = {
    environment: string;
};

const ENVIRONMENT_URL_MAP: Record<string, string> = {
    production: "https://signers.crossmint.com",
    staging: "https://staging.signers.crossmint.com",
    development: "http://localhost:3000",
};

export class EmailIframeManager {
    private handshakeParent: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null = null;

    constructor(private config: IframeConfig) {}

    async initialize(): Promise<HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>> {
        if (this.handshakeParent) {
            return this.handshakeParent;
        }

        const baseUrl = ENVIRONMENT_URL_MAP[this.config.environment] || ENVIRONMENT_URL_MAP.staging;
        const iframeUrl = new URL(baseUrl);

        const iframeElement = await this.createInvisibleIFrame(iframeUrl.toString());
        this.handshakeParent = await IFrameWindow.init(iframeElement, {
            targetOrigin: iframeUrl.origin,
            incomingEvents: signerOutboundEvents,
            outgoingEvents: signerInboundEvents,
        });

        await this.handshakeParent.handshakeWithChild();
        return this.handshakeParent;
    }

    private async createInvisibleIFrame(url: string): Promise<HTMLIFrameElement> {
        const iframe = document.createElement("iframe");
        iframe.src = url;

        // Make the iframe invisible but functional
        Object.assign(iframe.style, {
            position: "absolute",
            opacity: "0",
            pointerEvents: "none",
            width: "0",
            height: "0",
            border: "none",
            top: "-9999px",
            left: "-9999px",
        });

        return new Promise((resolve, reject) => {
            iframe.onload = () => resolve(iframe);
            iframe.onerror = () => reject(new Error("Failed to load iframe content"));
            document.body.appendChild(iframe);
        });
    }
}
