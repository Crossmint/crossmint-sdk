import React, { FC, ReactNode, useState } from "react";
import { CrossMintModal, CrossMintModalProps } from "./CrossMintModal";
import { CrossMintModalContext } from "./useCrossMintModal";
// import { WalletModal, WalletModalProps } from './WalletModal';

export interface CrossMintModalProviderProps extends CrossMintModalProps {
    children: ReactNode;
}

export const CrossMintModalProvider: FC<CrossMintModalProviderProps> = ({ children, ...props }) => {
    const [visible, setVisible] = useState(false);

    return (
        <CrossMintModalContext.Provider
            value={{
                visible,
                setVisible,
            }}
        >
            {children}
            {visible && <CrossMintModal {...props} />}
        </CrossMintModalContext.Provider>
    );
};
