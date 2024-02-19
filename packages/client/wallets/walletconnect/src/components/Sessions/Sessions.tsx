import { CheckCircleIcon } from "@heroicons/react/24/outline";

import { useCrossmintWalletConnect } from "../../hooks/useCrossmintWalletConnect";

export default function Sessions() {
    const { uiConfig, dictionary } = useCrossmintWalletConnect();

    return (
        <div
            className="flex flex-col items-center justify-start p-6 shadow-md sm:p-8 md:p-10 rounded-xl w-full max-w-[500px] text-center"
            style={{
                backgroundColor: uiConfig.colors.backgroundSecondary,
            }}
        >
            <CheckCircleIcon color={uiConfig.colors.accent} className="w-[72px] h-[72px]" />

            <h1
                className="mt-5 text-xl font-semibold tracking-tight"
                style={{
                    color: uiConfig.colors.textPrimary,
                }}
            >
                {dictionary.connectedSession.yourWalletIsConnected}
            </h1>
            <p
                className="w-3/4 mt-1 text-sm"
                style={{
                    color: uiConfig.colors.textSecondary,
                }}
            >
                {dictionary.connectedSession.leaveThisTabOpen}
            </p>

            <p
                className="font-medium mt-7"
                style={{
                    color: uiConfig.colors.accent,
                }}
            >
                {dictionary.connectedSession.dontCloseThisWindow}
            </p>
        </div>
    );
}
