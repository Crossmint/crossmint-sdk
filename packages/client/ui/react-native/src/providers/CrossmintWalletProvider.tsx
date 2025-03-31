import { type ReactNode, useMemo, useState } from "react";
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import {
    type ValidWalletState,
    type GetOrCreateWalletProps,
    WalletContext,
    deriveErrorState,
} from "@crossmint/client-sdk-react-base";

import { useCrossmint } from "@/hooks";
import { useCrossmintMobile } from "@/hooks/useCrossmint";

export function CrossmintWalletProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const { appId } = useCrossmintMobile("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => CrossmintWallets.from(crossmint, { appId }), [crossmint, appId]);

    const [walletState, setWalletState] = useState<ValidWalletState>({
        status: "not-loaded",
    });

    const getOrCreateWallet = async (props: GetOrCreateWalletProps) => {
        if (walletState.status == "in-progress") {
            console.log("Wallet already loading");
            return {
                startedCreation: false,
                reason: "Wallet is already loading.",
            };
        }

        if (crossmint.jwt == null) {
            return {
                startedCreation: false,
                reason: `Jwt not set in "CrossmintProvider".`,
            };
        }

        try {
            setWalletState({ status: "in-progress" });

            switch (props.type) {
                case "evm-smart-wallet": {
                    const walletArgs = {
                        chain: props.args.chain,
                        adminSigner: props.args.adminSigner ?? { type: "evm-passkey" },
                        linkedUser: props.args.linkedUser,
                    };
                    const wallet = await smartWalletSDK.getOrCreateWallet("evm-smart-wallet", walletArgs);
                    setWalletState({ status: "loaded", wallet, type: "evm-smart-wallet" });
                    break;
                }
                case "solana-smart-wallet": {
                    const wallet = await smartWalletSDK.getOrCreateWallet("solana-smart-wallet", props.args);
                    setWalletState({ status: "loaded", wallet, type: "solana-smart-wallet" });
                    break;
                }
            }
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setWalletState(deriveErrorState(error));
        }
        return { startedCreation: true };
    };

    const clearWallet = () => {
        setWalletState({ status: "not-loaded" });
    };

    return (
        <WalletContext.Provider
            value={{
                ...walletState,
                getOrCreateWallet,
                clearWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
