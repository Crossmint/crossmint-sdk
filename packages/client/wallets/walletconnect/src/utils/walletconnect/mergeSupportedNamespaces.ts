import type { BuildApprovedNamespacesParams } from "@walletconnect/utils";

export function mergeSupportedNamespaces(
    supportedNamespaces: BuildApprovedNamespacesParams["supportedNamespaces"][]
): BuildApprovedNamespacesParams["supportedNamespaces"] {
    const mergedNamespaces = { ...supportedNamespaces[0] };

    supportedNamespaces.slice(1).forEach((optionalNamespaces) => {
        Object.keys(optionalNamespaces).forEach((key) => {
            if (!mergedNamespaces[key]) {
                mergedNamespaces[key] = optionalNamespaces[key];
            } else {
                mergedNamespaces[key] = {
                    chains: Array.from(
                        new Set([...(mergedNamespaces[key].chains || []), ...(optionalNamespaces[key].chains || [])])
                    ),
                    accounts: Array.from(
                        new Set([
                            ...(mergedNamespaces[key].accounts || []),
                            ...(optionalNamespaces[key].accounts || []),
                        ])
                    ),
                    methods: Array.from(
                        new Set([...(mergedNamespaces[key].methods || []), ...(optionalNamespaces[key].methods || [])])
                    ),
                    events: Array.from(
                        new Set([...(mergedNamespaces[key].events || []), ...(optionalNamespaces[key].events || [])])
                    ),
                };
            }
        });
    });

    return mergedNamespaces;
}
