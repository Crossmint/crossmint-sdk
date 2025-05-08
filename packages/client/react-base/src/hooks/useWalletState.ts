import { useState } from "react";

import type { CrossmintWallets, Callbacks } from "@crossmint/wallets-sdk";

import { deriveErrorState, type ValidWalletState } from "@/providers";
import type { GetOrCreateWalletProps } from "@/types";

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

    const getOrCreateWallet = async (props: GetOrCreateWalletProps) => {
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

            switch (props.type) {
                case "evm-smart-wallet": {
                    const walletArgs = {
                        chain: props.args.chain,
                        adminSigner: props.args.adminSigner ?? { type: "evm-passkey" },
                        linkedUser: props.args.linkedUser,
                    };
                    const wallet = await crossmintWallets.getOrCreateWallet("evm-smart-wallet", walletArgs, {
                        experimental_callbacks: callbacks,
                    });
                    setState({ status: "loaded", wallet, type: "evm-smart-wallet" });
                    break;
                }
                case "solana-smart-wallet": {
                    const wallet = await crossmintWallets.getOrCreateWallet("solana-smart-wallet", props.args, {
                        experimental_callbacks: callbacks,
                    });
                    setState({ status: "loaded", wallet, type: "solana-smart-wallet" });
                    break;
                }
            }
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
