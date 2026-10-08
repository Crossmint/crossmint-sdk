import type { CrossmintWalletConnectWallet } from "@/types/wallet";

import { walletToSupportedNamespaces } from "./walletToSupportedNamespaces";

export async function getWalletByAddressAndChainId(
    wallets: CrossmintWalletConnectWallet[],
    requestedSignerAddress: string,
    chainId: string
) {
    const namespaceKey = chainId.includes(":") ? chainId.split(":")[0] : chainId;
    const requestedAccount = normalizeAccount(namespaceKey, `${chainId}:${requestedSignerAddress}`);

    // Array.prototype.find does not await its predicate, so resolve every wallet's namespaces first
    const results = await Promise.allSettled(wallets.map(walletToSupportedNamespaces));
    const owner = wallets.find((_, i) => {
        const result = results[i];
        return (
            result.status === "fulfilled" &&
            result.value[namespaceKey]?.accounts.some(
                (account) => normalizeAccount(namespaceKey, account) === requestedAccount
            )
        );
    });
    if (owner) {
        return owner;
    }

    // A wallet that failed to load (e.g. a locked extension) may be the owner, so let the caller retry
    const failure = results.find((result) => result.status === "rejected");
    if (failure) {
        throw failure.reason;
    }
    return undefined;
}

// EVM addresses are case-insensitive hex, and dApps such as ethers v5 send them lowercased
function normalizeAccount(namespaceKey: string, account: string) {
    return namespaceKey === "eip155" ? account.toLowerCase() : account;
}
