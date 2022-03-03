import { useCrossmintModalService, CrossmintModalServiceReturn } from "@crossmint/client-sdk-base";
import { useState } from "react";
import { LIB_VERSION } from "../version";

interface IProps {
    development: boolean;
    clientId: string;
    showOverlay: boolean;
}

interface IReturn extends CrossmintModalServiceReturn {
    connecting: boolean;
}

export default function useCrossMintModal({ development, clientId, showOverlay }: IProps): IReturn {
    const [connecting, setConnecting] = useState(false);

    const { connect } = useCrossmintModalService({
        development,
        clientId,
        showOverlay,
        setConnecting,
        libVersion: LIB_VERSION,
    });

    return { connecting, connect };
}
