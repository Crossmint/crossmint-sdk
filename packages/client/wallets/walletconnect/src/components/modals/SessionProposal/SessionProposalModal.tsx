import { useWalletConnectWallets } from "@/hooks/useWalletConnectWallets";
import { supportsRequiredChains } from "@/utils/wallet/supportsRequiredChains";
import { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useEffect, useState } from "react";

import RequestedPermissionsModal from "./RequestedPermissionsModal";
import UnsupportedChainsRequestedModal from "./UnsupportedChainsRequestedModal";

export default function SessionProposalModal({ proposal }: { proposal: Web3WalletTypes.SessionProposal }) {
    const [supportedNamespaces, setSupportedNamespaces] = useState<
        BuildApprovedNamespacesParams["supportedNamespaces"] | undefined
    >(undefined);

    const { getSupportedNamespaces } = useWalletConnectWallets();

    useEffect(() => {
        (async () => {
            const supportedNamespaces = await getSupportedNamespaces();
            setSupportedNamespaces(supportedNamespaces);
        })();
    }, [proposal]);

    if (!supportedNamespaces) {
        return null;
    }

    const { canSupport: canSupportChains, unsupportedChains } = supportsRequiredChains(proposal, supportedNamespaces);

    if (!canSupportChains) {
        return <UnsupportedChainsRequestedModal proposal={proposal} unsupportedChains={unsupportedChains} />;
    }

    return <RequestedPermissionsModal proposal={proposal} />;
}
