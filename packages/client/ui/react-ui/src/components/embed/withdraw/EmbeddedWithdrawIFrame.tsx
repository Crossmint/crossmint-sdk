import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useEffect, useRef, useState } from "react";

import {
    type CrossmintEmbeddedWithdrawProps,
    type EmbeddedWithdrawIFrameEmitter,
    crossmintEmbeddedWithdrawService,
} from "@crossmint/client-sdk-base";

import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";

export function EmbeddedWithdrawIFrame(props: CrossmintEmbeddedWithdrawProps) {
    const [iframeClient, setIframeClient] = useState<EmbeddedWithdrawIFrameEmitter | null>(null);
    const [height, setHeight] = useState(0);

    const memoizedProps = useRef(props);
    if (JSON.stringify(props) !== JSON.stringify(memoizedProps.current)) {
        memoizedProps.current = { ...props };
    }

    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, {
        usageOrigin: "client",
    });
    const withdrawService = crossmintEmbeddedWithdrawService({ apiClient });

    const ref = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const iframe = ref.current;
        if (!iframe || iframeClient) {
            return;
        }
        setIframeClient(withdrawService.iframe.createClient(iframe));
    }, [ref.current, iframeClient]);

    useEffect(() => {
        if (iframeClient == null) {
            return;
        }
        iframeClient.on("ui:height.changed", (data) => setHeight(data.height));

        return () => {
            iframeClient.off("ui:height.changed");
        };
    }, [iframeClient]);

    return (
        <>
            <iframe
                ref={ref}
                src={withdrawService.iframe.getUrl(memoizedProps.current)}
                id="crossmint-embedded-withdraw.iframe"
                role="crossmint-embedded-withdraw.iframe"
                allow="payment *"
                style={{
                    boxShadow: "none",
                    border: "none",
                    padding: "0px",
                    width: "100%",
                    minWidth: "100%",
                    overflow: "hidden",
                    display: "block",
                    userSelect: "none",
                    transform: "translate(0px)",
                    opacity: "1",
                    transition: "ease 0s, opacity 0.4s ease 0.1s",
                    height: `${height}px`,
                    backgroundColor: "transparent",
                }}
            />
            <span id="crossmint-withdraw-focus-target" tabIndex={-1} />
        </>
    );
}
