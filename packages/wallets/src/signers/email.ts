import { IFrameWindow } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";
import type { Crossmint } from "@crossmint/common-sdk-base";
import type { EmailInternalSignerConfig, Signer } from "./types";
import { EmailSignerApiClient } from "./email-signer-api-client";

export class EmailSigner implements Signer {
    type = "email" as const;
    private _apiClient: EmailSignerApiClient;

    constructor(
        private config: EmailInternalSignerConfig,
        crossmint: Crossmint
    ) {
        this._apiClient = new EmailSignerApiClient(crossmint);
        this.initHandshakeParent();
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

    private async initHandshakeParent() {
        if (this.config._handshakeParent == null) {
            const iframeUrl = new URL("https://signers.crossmint.com/");
            iframeUrl.searchParams.set("environment", this._apiClient.environment);
            const iframeElement = await this.createInvisibleIFrame(iframeUrl.toString());
            const handshakeParent = await IFrameWindow.init(iframeElement, {
                targetOrigin: iframeUrl.origin,
                incomingEvents: signerOutboundEvents,
                outgoingEvents: signerInboundEvents,
            });
            this.config._handshakeParent = handshakeParent;
            await handshakeParent.handshakeWithChild();
        }
    }

    private async pregenerateSigner() {
        if (this.config.email == null) {
            throw new Error("Email is required to pregenerate a signer");
        }
        const response = await this._apiClient.pregenerateSigner(this.config.email);
        return response;
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
