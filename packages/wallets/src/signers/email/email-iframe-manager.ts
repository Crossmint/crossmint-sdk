import { IFrameWindow, type HandshakeParent } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

export class EmailIframeManager {
    private handshakeParent: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null = null;

    constructor() {}

    async initialize(): Promise<HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>> {
        if (this.handshakeParent) {
            return this.handshakeParent;
        }

        const iframeUrl = new URL("https://staging.signers.crossmint.com/");

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
