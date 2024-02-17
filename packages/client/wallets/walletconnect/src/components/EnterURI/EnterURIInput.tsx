import Loader from "@/components/common/Loader";
import { useState } from "react";

import { useCrossmintWalletConnect } from "../../hooks/useCrossmintWalletConnect";
import { usePairWithURI } from "../../hooks/usePairWithURI";

export default function EnterURIInput({ uri: initalURI }: { uri?: string }) {
    const { uiConfig, dictionary } = useCrossmintWalletConnect();
    const { pair, isPairing, isAwaitingSessionProposal } = usePairWithURI();

    const [uri, setUri] = useState(initalURI || "");

    const loading = isPairing || isAwaitingSessionProposal;

    const isValidURI = uri.startsWith("wc:") && uri.includes("relay-protocol") && uri.includes("symKey");

    return (
        <div className="flex flex-col w-full">
            <h3
                className="self-start mb-3 font-medium tracking-tight"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {dictionary.enterURI.enterWCURI}
            </h3>
            <div
                className="flex w-full items-center p-0.5 rounded-lg gap-x-2"
                style={{
                    border: `1px solid ${uiConfig.colors.border}`,
                }}
            >
                <input
                    type="text"
                    placeholder={dictionary.enterURI.pasteURI}
                    className="w-full h-8 pl-2 text-sm truncate outline-none"
                    style={{
                        color: uiConfig.colors.textPrimary,
                        backgroundColor: uiConfig.colors.backgroundSecondary,
                    }}
                    value={uri}
                    disabled={loading}
                    onChange={(e) => setUri(e.target.value)}
                />

                <button
                    className="flex items-center justify-center px-4 whitespace-nowrap py-2 text-sm font-semibold tracking-tight transition-opacity duration-200 rounded-md h-9 hover:opacity-70 disabled:opacity-50"
                    style={{
                        backgroundColor: uiConfig.colors.accent,
                        color: uiConfig.colors.textAccentButton,
                    }}
                    onClick={() => pair(uri)}
                    disabled={loading || !isValidURI}
                >
                    {loading ? (
                        <Loader size={4} color={uiConfig.colors.textAccentButton} className="mx-3" />
                    ) : (
                        <>{dictionary.buttons.connect}</>
                    )}
                </button>
            </div>
        </div>
    );
}
