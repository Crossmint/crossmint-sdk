import { type HandshakeParent, IFrameWindow } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import type { EmailInternalSignerConfig, Signer } from "./types";

export class EmailSigner implements Signer {
    type = "email" as const;
    private _handshakeParent: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents> | null = null;

    constructor(
        private config: EmailInternalSignerConfig,
        private environment: APIKeyEnvironmentPrefix
    ) {
        this.initHandshakeParent(this.environment, config._handshakeParent);
    }

    // TODO: update for the wallet locator
    locator() {
        return `email:${this.config.email}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }
    async signTransaction() {
        return await Promise.reject(new Error("signTransaction method not implemented for email signer"));
    }

    private async initHandshakeParent(
        environment: string,
        configHandshakeParent?: HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>
    ) {
        if (configHandshakeParent == null) {
            const iframeUrl = new URL("https://signers.crossmint.com/");
            iframeUrl.searchParams.set("environment", environment);
            const iframeElement = await this.createInvisibleIFrame(iframeUrl.toString());
            this._handshakeParent = await IFrameWindow.init(iframeElement, {
                targetOrigin: iframeUrl.origin,
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
            });
            await this._handshakeParent.handshakeWithChild();
        } else {
            this._handshakeParent = configHandshakeParent;
        }
    }

    private async createInvisibleIFrame(url: string): Promise<HTMLIFrameElement> {
        const iframe = document.createElement("iframe");
        iframe.src = url;
        // Make the iframe invisible but functional
        iframe.style.position = "absolute";
        iframe.style.opacity = "0";
        iframe.style.pointerEvents = "none";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "none";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";

        return new Promise((resolve, reject) => {
            iframe.onload = () => resolve(iframe);
            iframe.onerror = () => reject("Failed to load iframe content");
            document.body.appendChild(iframe);
        });
    }
}
