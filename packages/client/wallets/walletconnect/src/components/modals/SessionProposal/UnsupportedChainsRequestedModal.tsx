import { ErrorModal } from "@/components/common/layouts/modal/ErrorModal";
import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";
import { useWalletConnectSessions } from "@/hooks/useWalletConnectSessions";
import { pluralize } from "@/utils/strings";
import { prettifyWalletConnectChain } from "@/utils/walletconnect/prettifyWalletConnectChain";
import { Web3WalletTypes } from "@walletconnect/web3wallet";
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
        if (unsupportedChains.length === 2) {
            return `${prettifyWalletConnectChain(unsupportedChains[0])} ${
                dictionary.common.and
            } ${prettifyWalletConnectChain(unsupportedChains[1])}`;
        }
        return unsupportedChains.map(prettifyWalletConnectChain).join(", ");
    };

    return (
        <ErrorModal
            title={`${dictionary.unsupportedChainsRequested.unsupported} ${pluralize(
                dictionary.common.chain,
                dictionary.common.chains,
                unsupportedChains.length
            )}`}
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
                    , {dictionary.unsupportedChainsRequested.butYourWalletDoesNotSupport}{" "}
                    {pluralize(
                        dictionary.unsupportedChainsRequested.thisChain,
                        dictionary.unsupportedChainsRequested.theseChains,
                        unsupportedChains.length
                    )}
                </>
            }
            loading={loading}
            onClose={handleCloseClick}
        />
    );
}
