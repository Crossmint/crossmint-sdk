import React, { FC, ReactNode, useState } from "react";
import { CrossMintModal, CrossMintModalProps } from "./CrossMintModal";
import { CrossMintPopupProvider } from "./CrossMintPopupProvider";
import { CrossMintStatusProvider } from "./CrossMintStatusProvider";
import { CrossMintModalContext } from "./useCrossMintModal";

export interface CrossMintProviderProps extends CrossMintModalProps {
    clientId: string;
    auctionId?: string;
    hideMintOnInactiveClient?: boolean;
    development?: boolean;
    children: ReactNode;
}

export const CrossMintProvider: FC<CrossMintProviderProps> = ({
    clientId,
    auctionId,
    hideMintOnInactiveClient = false,
    development = false,
    children,
    ...props
}) => {
    const [visible, setVisible] = useState(false);

    return (
        <CrossMintStatusProvider
            clientId={clientId}
            hideMintOnInactiveClient={hideMintOnInactiveClient}
            auctionId={auctionId}
        >
            <CrossMintModalContext.Provider
                value={{
                    visible,
                    setVisible,
                }}
            >
                <CrossMintPopupProvider development={development}>
                    {children}
                    {visible && <CrossMintModal {...props} />}
                </CrossMintPopupProvider>
            </CrossMintModalContext.Provider>
        </CrossMintStatusProvider>
    );
};
