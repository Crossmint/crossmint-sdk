import { useWalletConnectWallets } from "@/hooks/useWalletConnectWallets";
import { supportedNamespacesSatisfiesRequiredChains } from "@/utils/wallet/supportedNamespacesSatisfiesRequiredChains";
import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import type { Web3WalletTypes } from "@walletconnect/web3wallet";
import { useEffect, useState } from "react";

import RequestedPermissionsModal from "./RequestedPermissionsModal";
import UnsupportedChainsRequestedModal from "./UnsupportedChainsRequestedModal";

export default function SessionProposalViewRouter({ proposal }: { proposal: Web3WalletTypes.SessionProposal }) {
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

    const { satisfies: satisfiesRequredChains, unsupportedChains } = supportedNamespacesSatisfiesRequiredChains(
        proposal.params.requiredNamespaces,
        supportedNamespaces
    );

    if (!satisfiesRequredChains) {
        return <UnsupportedChainsRequestedModal proposal={proposal} unsupportedChains={unsupportedChains} />;
    }

    return <RequestedPermissionsModal proposal={proposal} />;
}
