import type { ProposalTypes } from "@walletconnect/types";
import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";

export function supportedNamespacesSatisfiesRequiredChains(
    requiredNamespaces: ProposalTypes.RequiredNamespaces,
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"]
) {
    const unsupportedChains: string[] = [];

    Object.entries(requiredNamespaces).forEach(([caipKey, requiredNamespace]) => {
        const supportedChainsForNamespace = supportedNamespaces[caipKey]?.chains || [];
        const requiredChains = requiredNamespace.chains || [];

        for (const requiredChain of requiredChains) {
            if (!supportedChainsForNamespace.includes(requiredChain)) {
                unsupportedChains.push(requiredChain);
            }
        }
    });

    return {
        satisfies: unsupportedChains.length === 0,
        supportedChains: Object.values(supportedNamespaces).flatMap((namespace) => namespace.chains || []),
        unsupportedChains,
    };
}
