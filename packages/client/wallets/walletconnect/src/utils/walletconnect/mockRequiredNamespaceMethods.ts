import { ProposalTypes } from "@walletconnect/types";
import { BuildApprovedNamespacesParams } from "@walletconnect/utils";

export function mockRequiredNamespaceMethods(
    requiredNamespaces: ProposalTypes.RequiredNamespaces,
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"]
) {
    const mockedNamespaces = { ...supportedNamespaces };

    Object.entries(requiredNamespaces).forEach(([caipKey, requiredNamespace]) => {
        if (!mockedNamespaces[caipKey]) {
            return;
        }

        const unsupportedRequiredMethods = requiredNamespace.methods.filter(
            (method) => !mockedNamespaces[caipKey].methods?.includes(method)
        );
        console.warn(
            "[mockRequiredNamespaceMethods] Mocking unsupported required methods:",
            unsupportedRequiredMethods
        );

        mockedNamespaces[caipKey].methods = Array.from(
            new Set([...(mockedNamespaces[caipKey].methods || []), ...requiredNamespace.methods])
        );
    });

    return mockedNamespaces;
}
