import { useState, useCallback, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { useWallet, useCrossmint } from "@/hooks";
import { theme } from "@/styles";
import { environmentUrlConfig } from "@crossmint/client-signers";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import { isExportableSigner } from "@crossmint/wallets-sdk";
// import { IFrameWindow } from "@crossmint/client-sdk-window";
// import { exportSignerInboundEvents, exportSignerOutboundEvents } from "@crossmint/client-signers";

interface ExportPrivateKeyButtonProps {
    onClick?: () => void;
    appearance?: UIConfig;
}

const ExportFrame = styled.iframe<{ appearance?: UIConfig }>`
    width: 100%;
    height: 56px;
    border: 1px solid ${(props) => props.appearance?.colors?.border || theme["cm-border"]};
    border-radius: ${(props) => props.appearance?.borderRadius || "12px"};
    background: transparent;
    margin: 0;
    padding: 0;
    outline: none;
    box-shadow: none;
`;

export function ExportPrivateKeyButton({ onClick, appearance }: ExportPrivateKeyButtonProps) {
    const { wallet } = useWallet();
    const { crossmint } = useCrossmint();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [frameUrl, setFrameUrl] = useState<string>("");

    // Get the TEE URL from the crossmint context
    useEffect(() => {
        if (crossmint != null) {
            try {
                const parsedAPIKey = validateAPIKey(crossmint.apiKey);
                if (parsedAPIKey.isValid) {
                    const baseUrl = environmentUrlConfig[parsedAPIKey.environment];
                    setFrameUrl(`${baseUrl}/export`);
                }
            } catch (error) {
                console.error("Failed to get TEE URL:", error);
            }
        }
    }, [crossmint]);

    const handleIframeLoad = useCallback(async () => {
        if (wallet == null || iframeRef.current == null) {
            return;
        }

        try {
            // Iframe has loaded, now trigger the export
            if (isExportableSigner(wallet.signer)) {
                /*
                const connection = await IFrameWindow.init(iframeRef.current, {
                    targetOrigin: frameUrl,
                    incomingEvents: exportSignerOutboundEvents,
                    outgoingEvents: exportSignerInboundEvents,
                });
                await connection.handshakeWithChild();
                await wallet.signer._exportPrivateKey(connection);
                */
                const payload = await wallet.signer._exportPrivateKey();
                const message = {
                    type: "request:export-signer",
                    ...payload,
                };
                console.log("sending message", message);
                console.log("contentWindow", iframeRef.current.contentWindow);
                iframeRef.current.contentWindow?.postMessage(message, frameUrl);
                onClick?.();
            }
        } catch (error) {
            console.error("Failed to export private key:", error);
        }
    }, [wallet, onClick, frameUrl]);

    if (frameUrl === "" || wallet == null || !isExportableSigner(wallet.signer)) {
        return null;
    }

    return (
        <ExportFrame
            ref={iframeRef}
            src={frameUrl}
            appearance={appearance}
            title="Export Private Key"
            allow="clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
        />
    );
}
