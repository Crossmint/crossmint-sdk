import { ErrorModal } from "@/components/common/layouts/modal/ErrorModal";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectSessions } from "@/hooks/useWalletConnectSessions";
import { prettifyWalletConnectChain } from "@/utils/walletconnect/prettifyWalletConnectChain";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useState } from "react";

export default function UnsupportedChainsRequestedModal({
    proposal,
    unsupportedChains,
}: {
    proposal: Web3WalletTypes.SessionProposal;
    unsupportedChains: string[];
}) {
    const [loading, setLoading] = useState(false);

    const { rejectSession } = useWalletConnectSessions();
    const { uiConfig, dictionary } = useCrossmintWalletConnect();

    async function handleCloseClick() {
        setLoading(true);
        await rejectSession(proposal, "UNSUPPORTED_CHAINS");
        setLoading(false);
    }

    const unsupportedChainsMessage = () => {
        if (unsupportedChains.length === 1) {
            return prettifyWalletConnectChain(unsupportedChains[0]);
        }
        // join with commas and "and" for the last one
        return (
            unsupportedChains
                .slice(0, unsupportedChains.length - 1)
                .map(prettifyWalletConnectChain)
                .join(", ") +
            ` ${dictionary.common.and} ${prettifyWalletConnectChain(unsupportedChains[unsupportedChains.length - 1])}`
        );
    };

    return (
        <ErrorModal
            title={dictionary.unsupportedChainsRequested.unsupportedChain_s(unsupportedChains.length)}
            message={
                <>
                    {proposal.params.proposer.metadata.name} {dictionary.unsupportedChainsRequested.requiresSupportFor}{" "}
                    <span
                        className="font-medium"
                        style={{
                            color: uiConfig.colors.textPrimary,
                        }}
                    >
                        {unsupportedChainsMessage()}
                    </span>
                    , {dictionary.unsupportedChainsRequested.butWalletDoesNotSupportChain_s(unsupportedChains.length)}
                </>
            }
            loading={loading}
            onClose={handleCloseClick}
        />
    );
}
