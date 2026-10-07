import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import { getWalletByAddressAndChainId } from "@/utils/wallet/getWalletByAddressAndChainId";
import { walletToSupportedNamespaces } from "@/utils/wallet/walletToSupportedNamespaces";
import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import type { WalletKitTypes } from "@reown/walletkit";
import { createContext, useContext } from "react";

import { decodeSendTransactionRequest } from "../utils/sendTransaction/decodeSendTransactionRequest";
import { isSendTransactionMethod } from "../utils/sendTransaction/isSendTransactionMethod";
import { decodeSignMessageRequest } from "../utils/signMessage/decodeSignMessageRequest";
import { isSignMessageMethod } from "../utils/signMessage/isSignMessageMethod";
import { mergeSupportedNamespaces } from "../utils/walletconnect/mergeSupportedNamespaces";

export type WalletConnectWalletsContext = {
    wallets: CrossmintWalletConnectWallet[];
    getSupportedNamespaces: () => Promise<BuildApprovedNamespacesParams["supportedNamespaces"]>;
    getWalletForRequest: (request: WalletKitTypes.SessionRequest) => Promise<CrossmintWalletConnectWallet | undefined>;
};

const WalletConnectWalletsContext = createContext<WalletConnectWalletsContext>({
    wallets: [],
    getSupportedNamespaces: async () => {
        throw new Error("getSupportedNamespaces called before WalletConnectWalletsContext was initialized");
    },
    getWalletForRequest: () => {
        throw new Error("getWalletForRequest called before WalletConnectWalletsContext was initialized");
    },
});

export function WalletConnectWalletsContextProvider({
    wallets,
    children,
}: {
    wallets: CrossmintWalletConnectWallet[];
    children: React.ReactNode;
}) {
    // const supportedNamespaces = mergeSupportedNamespaces(wallets.map((wallet) => wallet.supportedNamespaces));

    function getWalletForRequest(request: WalletKitTypes.SessionRequest) {
        const method = request.params.request.method;

        let requestedSignerAddress: string;
        let chainId: string;
        if (isSignMessageMethod(method)) {
            ({ requestedSignerAddress, chainId } = decodeSignMessageRequest(request));
        } else if (isSendTransactionMethod(method)) {
            ({ requestedSignerAddress, chainId } = decodeSendTransactionRequest(request));
        } else {
            throw new Error(`Unsupported method: ${method}`);
        }

        return getWalletByAddressAndChainId(wallets, requestedSignerAddress, chainId);
    }

    async function getSupportedNamespaces() {
        const supportedNamespaces = await Promise.all(wallets.map(walletToSupportedNamespaces));
        return mergeSupportedNamespaces(supportedNamespaces);
    }

    return (
        <WalletConnectWalletsContext.Provider value={{ wallets, getSupportedNamespaces, getWalletForRequest }}>
            {children}
        </WalletConnectWalletsContext.Provider>
    );
}

export function useWalletConnectWallets() {
    return useContext(WalletConnectWalletsContext);
}
