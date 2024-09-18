import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { toast } from "react-hot-toast";

import { useWalletConnectProvider } from "./useWalletConnectProvider";

export type PairWithURIContext = {
    isPairing: boolean;
    isAwaitingSessionProposal: boolean;
    pair: (uri: string) => Promise<void>;
};

const PairWithURIContext = createContext<PairWithURIContext>({
    isPairing: false,
    isAwaitingSessionProposal: false,
    pair: async () => {
        throw new Error("pair() called before provider was initialized");
    },
});

export function PairWithURIProvider({ children }: { children: ReactNode }) {
    const [isPairing, setIsPairing] = useState(false);
    const [isAwaitingSessionProposal, setIsAwaitingSessionProposal] = useState(false);

    const { provider } = useWalletConnectProvider();

    const pair = useCallback(
        async function pair(uri: string) {
            if (!provider) {
                throw new Error("Provider not initialized");
            }

            console.log("[CrossmintWalletConnectProvider] Pairing with URI", uri);
            setIsPairing(true);
            try {
                await provider.pair({ uri });
                setIsAwaitingSessionProposal(true);
            } catch (e) {
                console.error("Error pairing", e);
                toast.error("Failed to connect. Please try again.");
            } finally {
                setIsPairing(false);
            }
        },
        [provider]
    );

    useEffect(() => {
        if (!provider) {
            return;
        }

        provider.on("session_proposal", () => {
            setIsAwaitingSessionProposal(false);
        });
    }, [provider, pair]);

    useEffect(() => {
        let timeoutId: NodeJS.Timeout | undefined;
        if (isAwaitingSessionProposal) {
            console.log("[CrossmintWalletConnectProvider] Waiting for session proposal");
            timeoutId = setTimeout(() => {
                console.log("[CrossmintWalletConnectProvider] Waiting for session proposal timed out");
                toast.error("The connection attempt took too long. Copy a new uri and try again.");
                setIsAwaitingSessionProposal(false);
            }, 10000);
        }

        return () => {
            if (!timeoutId) {
                return;
            }
            clearTimeout(timeoutId);
        };
    }, [isAwaitingSessionProposal]);

    return (
        <PairWithURIContext.Provider
            value={{
                isPairing,
                isAwaitingSessionProposal,
                pair,
            }}
        >
            {children}
        </PairWithURIContext.Provider>
    );
}

export function usePairWithURI() {
    return useContext(PairWithURIContext);
}
