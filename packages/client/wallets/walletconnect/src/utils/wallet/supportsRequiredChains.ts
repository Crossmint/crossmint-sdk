import { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

export function supportsRequiredChains(
    proposal: Web3WalletTypes.SessionProposal,
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"]
) {
    const unsupportedChains: string[] = [];

    Object.entries(proposal.params.requiredNamespaces).forEach(([caipKey, requiredNamespace]) => {
        const supportedChainsForNamespace = supportedNamespaces[caipKey]?.chains || [];
        const requiredChains = requiredNamespace.chains || [];

        for (const requiredChain of requiredChains) {
            if (!supportedChainsForNamespace.includes(requiredChain)) {
                unsupportedChains.push(requiredChain);
            }
        }
    });

    return {
        canSupport: unsupportedChains.length === 0,
        supportedChains: Object.values(supportedNamespaces).flatMap((namespace) => namespace.chains || []),
        unsupportedChains,
    };
}
