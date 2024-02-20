import { BuildApprovedNamespacesParams } from "@walletconnect/utils";
import { Web3WalletTypes } from "@walletconnect/web3wallet";

export function supportsRequiredMethods(
    proposal: Web3WalletTypes.SessionProposal,
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"]
) {
    const unsupportedMethods: string[] = [];

    Object.entries(proposal.params.requiredNamespaces).forEach(([caipKey, requiredNamespace]) => {
        const supportedMethodsForNamespace = supportedNamespaces[caipKey]?.methods || [];
        const requiredMethods = requiredNamespace.methods;

        for (const requiredMethod of requiredMethods) {
            if (!supportedMethodsForNamespace.includes(requiredMethod)) {
                unsupportedMethods.push(requiredMethod);
            }
        }
    });

    return {
        canSupport: unsupportedMethods.length === 0,
        supportedMethods: Object.values(supportedNamespaces).flatMap((namespace) => namespace.methods || []),
        unsupportedMethods,
    };
}
