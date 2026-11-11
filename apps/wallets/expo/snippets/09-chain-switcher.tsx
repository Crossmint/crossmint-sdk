import { useCallback } from "react";
import { type Chain, useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { ChainSwitcher } from "@crossmint/wallets-playground-shared";

export const DEFAULT_CHAIN = (process.env.EXPO_PUBLIC_CHAIN as Chain) || "base-sepolia";

export function useLoadWallet() {
    const { getWallet, createWallet } = useWallet();
    const { user } = useCrossmintAuth();

    return useCallback(
        async (chain: Chain) => {
            const existing = await getWallet({ chain });
            if (existing == null) {
                await createWallet({ chain, recovery: { type: "email", email: user?.email ?? "" } } as any);
            }
        },
        [getWallet, createWallet, user?.email]
    );
}

export function ChainSwitcherSection() {
    const { wallet } = useWallet();
    const loadWallet = useLoadWallet();

    return <ChainSwitcher wallet={wallet} onSwitchChain={loadWallet} />;
}
