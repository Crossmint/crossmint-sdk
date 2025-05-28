import { useState } from "react";

import type { Callbacks, Chain, CrossmintWallets, WalletArgsFor } from "@crossmint/wallets-sdk";

import { deriveErrorState, type ValidWalletState } from "@/providers";

export function useWalletState({
    crossmintWallets,
    crossmintJwt,
    callbacks,
}: {
    crossmintWallets: CrossmintWallets;
    crossmintJwt: string | null;
    callbacks?: Callbacks;
}) {
    const [state, setState] = useState<ValidWalletState>({
        status: "not-loaded",
    });

    const getOrCreateWallet = async <C extends Chain>(props: WalletArgsFor<C>) => {
        if (state.status == "in-progress") {
            return {
                startedCreation: false,
                reason: "Wallet is already loading.",
            };
        }

        if (crossmintJwt == null) {
            return {
                startedCreation: false,
                reason: `Jwt not set in "CrossmintProvider".`,
            };
        }

        try {
            setState({ status: "in-progress" });
            const wallet = await crossmintWallets.getOrCreateWallet({
                ...props,
                options: {
                    experimental_callbacks: callbacks,
                },
            });
            setState({ status: "loaded", wallet });
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setState(deriveErrorState(error));
        }
        return { startedCreation: true };
    };

    const clearWallet = () => {
        setState({ status: "not-loaded" });
    };

    return {
        state,
        setState,
        getOrCreateWallet,
        clearWallet,
    };
}
