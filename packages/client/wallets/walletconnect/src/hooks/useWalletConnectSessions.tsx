import { mockRequiredNamespaceMethods } from "@/utils/walletconnect/mockRequiredNamespaceMethods";
import type { SessionTypes } from "@walletconnect/types";
import { type SdkErrorKey, buildApprovedNamespaces, getSdkError } from "@walletconnect/utils";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { type Dispatch, type SetStateAction, createContext, useCallback, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { useWalletConnectProvider } from "./useWalletConnectProvider";
import { useWalletConnectWallets } from "./useWalletConnectWallets";

export type WalletConnectSessionsContext = {
    sessionProposals: Web3WalletTypes.SessionProposal[];
    setSessionProposals: Dispatch<SetStateAction<Web3WalletTypes.SessionProposal[]>>;
    sessions: SessionTypes.Struct[];
    setSessions: Dispatch<SetStateAction<SessionTypes.Struct[]>>;
    approveSession: (proposal: Web3WalletTypes.SessionProposal) => Promise<void>;
    rejectSession: (proposal: Web3WalletTypes.SessionProposal, reason?: SdkErrorKey) => Promise<void>;
    getSessionForRequest: (request: Web3WalletTypes.SessionRequest) => SessionTypes.Struct | undefined;
};
const WalletConnectSessionsContext = createContext<WalletConnectSessionsContext>({
    sessionProposals: [],
    setSessionProposals: () => {
        throw new Error("setSessionProposals called before WalletConnectSessionsContext was initialized");
    },
    sessions: [],
    setSessions: () => {
        throw new Error("setSessions called before WalletConnectSessionsContext was initialized");
    },
    approveSession: () => {
        throw new Error("approveSession called before WalletConnectSessionsContext was initialized");
    },
    rejectSession: () => {
        throw new Error("rejectSession called before WalletConnectSessionsContext was initialized");
    },
    getSessionForRequest: () => {
        throw new Error("getSessionForRequest called before WalletConnectSessionsContext was initialized");
    },
});

export function WalletConnectSessionsContextProvider({ children }: { children: React.ReactNode }) {
    const [sessionProposals, setSessionProposals] = useState<Web3WalletTypes.SessionProposal[]>([]);
    const [sessions, setSessions] = useState<SessionTypes.Struct[]>([]);

    const { provider } = useWalletConnectProvider();
    const { getSupportedNamespaces } = useWalletConnectWallets();

    const onSessionProposal = useCallback((proposal: Web3WalletTypes.SessionProposal) => {
        console.log("[WalletConnectSessionsContextProvider] Incoming session_proposal", proposal);
        setSessionProposals((prev) => [...prev, proposal]);
    }, []);

    useEffect(() => {
        if (!provider) {
            return;
        }
        provider.on("session_proposal", onSessionProposal);
    }, [provider, onSessionProposal]);

    function removeSessionProposal(proposal: Web3WalletTypes.SessionProposal) {
        setSessionProposals((proposals) => proposals.filter((p) => p.id !== proposal.id));
    }

    async function approveSession(proposal: Web3WalletTypes.SessionProposal) {
        if (!provider) {
            console.error("[WalletConnectSessionsContextProvider.approveSession()] provider is undefined");
            return;
        }

        console.log("[WalletConnectSessionsContextProvider.approveSession()] approving session proposal", proposal);
        try {
            const supportedNamespaces = await getSupportedNamespaces();
            const supportedNamespacesWithMockedMethods = mockRequiredNamespaceMethods(
                proposal.params.requiredNamespaces,
                supportedNamespaces
            ); // We mock the supported methods to improve compatibility. If a mocked method is attempted to be called later, we show an "Unsupported method" modal

            const approvedNamespaces = buildApprovedNamespaces({
                proposal: proposal.params,
                supportedNamespaces: supportedNamespacesWithMockedMethods,
            });
            console.log(
                "[WalletConnectSessionsContextProvider.approveSession()] approvedNamespaces",
                approvedNamespaces
            );

            const session = await provider.approveSession({
                id: proposal.id,
                namespaces: approvedNamespaces,
            });
            setSessions((sessions) => [...sessions, session]);
            removeSessionProposal(proposal);
        } catch (error) {
            console.error("[WalletConnectSessionsContextProvider.approveSession()] Error", error);
            toast.error(`Failed to connect to ${proposal.params.proposer.metadata.name}. Please try again.`);
            await rejectSession(proposal);
        }
    }

    function getSessionForRequest(request: Web3WalletTypes.SessionRequest) {
        return sessions.find((s) => s.topic === request.topic);
    }

    async function rejectSession(proposal: Web3WalletTypes.SessionProposal, reason?: SdkErrorKey) {
        if (!provider) {
            console.error("[WalletConnectSessionsContextProvider.rejectSession()] provider is undefined");
            return;
        }
        console.log("[WalletConnectSessionsContextProvider.rejectSession()] rejecting session proposal", proposal);
        try {
            await provider?.rejectSession({
                id: proposal.id,
                reason: getSdkError(reason || "USER_REJECTED"),
            });
        } catch (e) {
            console.error("[WalletConnectSessionsContextProvider.rejectSession()] Error", e);
        }
        removeSessionProposal(proposal);
    }

    return (
        <WalletConnectSessionsContext.Provider
            value={{
                sessionProposals,
                setSessionProposals,
                sessions,
                setSessions,
                approveSession,
                rejectSession,
                getSessionForRequest,
            }}
        >
            {children}
        </WalletConnectSessionsContext.Provider>
    );
}

export function useWalletConnectSessions() {
    return useContext(WalletConnectSessionsContext);
}
