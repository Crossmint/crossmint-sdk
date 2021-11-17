import React, { FC, ReactNode, useState } from 'react';
import { CrossMintModal, CrossMintModalProps } from './CrossMintModal';
import { CrossMintPopupProvider } from './CrossMintPopupProvider';
import { CrossMintModalContext } from './useCrossMintModal';
// import { WalletModal, WalletModalProps } from './WalletModal';

export interface CrossMintProviderProps extends CrossMintModalProps {
    children: ReactNode;
}

export const CrossMintProvider: FC<CrossMintProviderProps> = ({ children, ...props }) => {
    const [visible, setVisible] = useState(false);

    return (
        <CrossMintModalContext.Provider
            value={{
                visible,
                setVisible,
            }}
        >
            <CrossMintPopupProvider>
                {children}
                {visible && <CrossMintModal {...props} />}
            </CrossMintPopupProvider>
        </CrossMintModalContext.Provider>
    );
};
