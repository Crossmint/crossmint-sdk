import { useEffect, useRef } from "react";
import { IFrameWindow } from "@crossmint/client-sdk-window";
import { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

async function createInvisibleIFrame(url: string): Promise<HTMLIFrameElement> {
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

export function useSignerIFrameWindow(environment: string, url?: string) {
    const iframeWindow = useRef<IFrameWindow<typeof signerOutboundEvents, typeof signerInboundEvents> | null>(null);
    useEffect(() => {
        const initIFrameWindow = async () => {
            try {
                const iframeUrl = new URL(url || "https://staging.signers.crossmint.com/");
                iframeUrl.searchParams.set("environment", environment);
                const iframeElement = await createInvisibleIFrame(iframeUrl.toString());
                iframeWindow.current = await IFrameWindow.init(iframeElement, {
                    targetOrigin: iframeUrl.origin,
                    incomingEvents: signerOutboundEvents,
                    outgoingEvents: signerInboundEvents,
                });

                await iframeWindow.current.handshakeWithChild();
            } catch (err) {
                console.error("Failed to initialize or connect to iframe:", err);
            }
        };
        initIFrameWindow();
        // Cleanup function
        return () => {
            if (iframeWindow.current) {
                // Add cleanup if needed
            }
        };
    }, []);

    return iframeWindow;
}
