import { useCallback } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { ChainSwitcher } from "@crossmint/wallets-playground-shared";

export function ChainSwitcherSection() {
    const { wallet, getWallet, createWallet } = useWallet();
    const { user } = useCrossmintAuth();

    const handleSwitchChain = useCallback(
        async (chain: string) => {
            const result = await getWallet({ chain });
            if (result == null) {
                // Wallet doesn't exist for this chain yet — create it with the same email recovery.
                await createWallet({ chain, recovery: { type: "email", email: user?.email ?? "" } } as any);
            }
        },
        [getWallet, createWallet, user?.email]
    );

    return <ChainSwitcher wallet={wallet} onSwitchChain={handleSwitchChain} />;
}
