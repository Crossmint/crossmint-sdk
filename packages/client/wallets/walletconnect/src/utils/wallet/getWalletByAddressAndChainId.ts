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
    const supportedNamespaces = await Promise.all(wallets.map(walletToSupportedNamespaces));
    return wallets.find((_, i) =>
        supportedNamespaces[i][namespaceKey]?.accounts.some(
            (account) => normalizeAccount(namespaceKey, account) === requestedAccount
        )
    );
}

// EVM addresses are case-insensitive hex, and dApps such as ethers v5 send them lowercased
function normalizeAccount(namespaceKey: string, account: string) {
    return namespaceKey === "eip155" ? account.toLowerCase() : account;
}
