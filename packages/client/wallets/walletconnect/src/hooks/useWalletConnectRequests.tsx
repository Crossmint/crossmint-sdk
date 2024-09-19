import { handleAcceptSendTransaction } from "@/utils/sendTransaction/handleAcceptSendTransaction";
import { handleAcceptSignMessage } from "@/utils/signMessage/handleAcceptSignMessage";
import { type JsonRpcResult, formatJsonRpcError } from "@walletconnect/jsonrpc-utils";
import { type SdkErrorKey, getSdkError } from "@walletconnect/utils";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

import type { CrossmintWalletConnectWallet } from "..";
import { isSendTransactionMethod } from "../utils/sendTransaction/isSendTransactionMethod";
import { isSignMessageMethod } from "../utils/signMessage/isSignMessageMethod";
import { useWalletConnectProvider } from "./useWalletConnectProvider";
import { useWalletConnectSessions } from "./useWalletConnectSessions";
import { useWalletConnectWallets } from "./useWalletConnectWallets";

export type WalletConnectRequestsContext = {
    requests: Web3WalletTypes.SessionRequest[];
    acceptRequest: (request: Web3WalletTypes.SessionRequest) => Promise<void>;
    rejectRequest: (request: Web3WalletTypes.SessionRequest, reason?: SdkErrorKey) => Promise<void>;
};
const WalletConnectRequestsContext = createContext<WalletConnectRequestsContext>({
    requests: [],
    acceptRequest: () => {
        throw new Error("acceptRequest called before WalletConnectRequestsContext was initialized");
    },
    rejectRequest: () => {
        throw new Error("rejectRequest called before WalletConnectRequestsContext was initialized");
    },
});

export function WalletConnectRequestsContextProvider({ children }: { children: React.ReactNode }) {
    const [requests, setRequests] = useState<Web3WalletTypes.SessionRequest[]>([]);

    const { provider } = useWalletConnectProvider();
    const { sessions } = useWalletConnectSessions();
    const { getWalletForRequest } = useWalletConnectWallets();

    const onSessionRequest = useCallback(
        (request: Web3WalletTypes.SessionRequest) => {
            if (sessions.length === 0) {
                console.log("[ModalController] Incoming session_request, but no sessions available. Ignoring.");
                return;
            }
            console.log("[ModalController] Incoming session_request", request);
            setRequests((prev) => [...prev, request]);
        },
        [sessions]
    );

    useEffect(() => {
        if (!provider) {
            return;
        }
        provider.on("session_request", onSessionRequest);
    }, [provider, onSessionRequest]);

    async function rejectRequest(request: Web3WalletTypes.SessionRequest, reason?: SdkErrorKey) {
        const { id, topic } = request;
        try {
            await provider?.respondSessionRequest({
                topic,
                response: formatJsonRpcError(id, getSdkError(reason || "USER_REJECTED").message),
            });
        } catch (e) {
            console.error("[WalletConnectRequestsContextProvider.rejectRequest()] failed to reject session request", e);
        }
        removeRequest(request);
    }

    async function acceptRequest(request: Web3WalletTypes.SessionRequest) {
        const {
            topic,
            params: {
                request: { method },
            },
        } = request;

        const wallet = await getWalletForRequest(request);
        if (!wallet) {
            console.error("[WalletConnectRequestsContextProvider.acceptRequest()] wallet not found for request");
            rejectRequest(request);
            return;
        }

        // If the user closes the metamask window, for example, we keep the modal open so they can try again
        let response: JsonRpcResult;
        try {
            response = await handleAcceptRequest(request, wallet);
        } catch (e) {
            console.error("[WalletConnectRequestsContextProvider.acceptRequest()] failed to handle request", e);
            return;
        }

        try {
            await provider?.respondSessionRequest({
                topic,
                response,
            });
            removeRequest(request);
        } catch (e) {
            console.error(
                "[WalletConnectRequestsContextProvider.acceptRequest()] failed to respond to session request",
                e
            );
            toast.error(`Failed to respond to ${method} request`);
            rejectRequest(request);
        }
    }

    function removeRequest(request: Web3WalletTypes.SessionRequest) {
        setRequests((prev) => prev.filter((r) => r.id !== request.id));
    }

    return (
        <WalletConnectRequestsContext.Provider value={{ requests, acceptRequest, rejectRequest }}>
            {children}
        </WalletConnectRequestsContext.Provider>
    );
}

export function useWalletConnectRequests() {
    return useContext(WalletConnectRequestsContext);
}

async function handleAcceptRequest(request: Web3WalletTypes.SessionRequest, wallet: CrossmintWalletConnectWallet) {
    const { params } = request;
    const method = params.request.method;

    if (isSignMessageMethod(method)) {
        return handleAcceptSignMessage(request, wallet);
    } else if (isSendTransactionMethod(method)) {
        return handleAcceptSendTransaction(request, wallet);
    } else {
        throw new Error(`Unsupported method: ${method}`);
    }
}
