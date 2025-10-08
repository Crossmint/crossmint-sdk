import { useState, useCallback, useRef, useEffect } from "react";
import styled from "@emotion/styled";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { useWallet, useCrossmint } from "@/hooks";
import { theme } from "@/styles";
import { environmentUrlConfig, exportSignerInboundEvents, exportSignerOutboundEvents } from "@crossmint/client-signers";
import { validateAPIKey } from "@crossmint/common-sdk-base";
import { isExportableSigner } from "@crossmint/wallets-sdk";
import { IFrameWindow, SignersWindowTransport } from "@crossmint/client-sdk-window";

interface ExportPrivateKeyButtonProps {
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

export function ExportPrivateKeyButton({ appearance }: ExportPrivateKeyButtonProps) {
    const { wallet } = useWallet();
    const { crossmint } = useCrossmint();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [frameUrl, setFrameUrl] = useState<string>("");

    useEffect(() => {
        if (crossmint != null) {
            try {
                const parsedAPIKey = validateAPIKey(crossmint.apiKey);
                if (parsedAPIKey.isValid) {
                    const baseUrl = environmentUrlConfig[parsedAPIKey.environment];
                    const exportUrl = new URL(`${baseUrl}/export`);
                    exportUrl.searchParams.set("targetOrigin", window.location.origin);
                    setFrameUrl(exportUrl.toString());
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
            if (isExportableSigner(wallet.signer)) {
                const connection = await IFrameWindow.init(
                    iframeRef.current,
                    {
                        targetOrigin: new URL(frameUrl).origin,
                        incomingEvents: exportSignerOutboundEvents,
                        outgoingEvents: exportSignerInboundEvents,
                    },
                    SignersWindowTransport
                );
                await connection.handshakeWithChild();
                await wallet.signer._exportPrivateKey(connection);
            }
        } catch (error) {
            console.error("Failed to export private key:", error);
        }
    }, [wallet, frameUrl]);

    if (frameUrl.toString() === "" || wallet == null || !isExportableSigner(wallet.signer)) {
        return null;
    }

    return (
        <ExportFrame
            ref={iframeRef}
            src={frameUrl.toString()}
            appearance={appearance}
            title="Export Private Key"
            allow="clipboard-write"
            onLoad={handleIframeLoad}
        />
    );
}
