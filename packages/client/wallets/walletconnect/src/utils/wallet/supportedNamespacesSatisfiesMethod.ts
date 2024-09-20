import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";

export function supportedNamespacesSatisfiesMethod(
    method: string,
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"]
) {
    return Object.values(supportedNamespaces).some((namespace) => {
        return namespace.methods.some((supportedMethod) => {
            return supportedMethod === method;
        });
    });
}
