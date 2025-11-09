"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet, type Chain } from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets as usePrivyWallets } from "@privy-io/react-auth";
import type { VersionedTransaction } from "@solana/web3.js";

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const { setJwt, crossmint } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet, getOrCreateWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = usePrivyWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;
    const chain = process.env.NEXT_PUBLIC_EVM_CHAIN! as Chain;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                if (privyJwt != null) {
                    setJwt(privyJwt);
                }
            } catch (error) {
                setJwt(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        console.log("ready", ready);
        console.log("authenticated", authenticated);
        console.log("privyEmbeddedWallet", privyEmbeddedWallet);
        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, privyEmbeddedWallet, setJwt]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        const signerType = getSignerType(user, privyEmbeddedWallet);
        console.log("signerType", signerType);
        if (!signerType) {
            console.warn("No suitable signer type found for EVM wallet creation");
            return;
        }

        switch (signerType) {
            case "phone":
                const phone = user?.phone?.number;
                if (phone) {
                    createPhoneWallet(getOrCreateWallet, chain, phone);
                }
                break;
            case "email":
                const email = user?.email?.address ?? user?.google?.email;
                if (email) {
                    createEmailWallet(getOrCreateWallet, chain, email);
                }
                break;
            case "external-wallet":
                if (privyEmbeddedWallet?.address) {
                    createExternalWalletEVM(getOrCreateWallet, chain, privyEmbeddedWallet);
                }
                break;
        }
    }, [crossmint.jwt, user, privyEmbeddedWallet, getOrCreateWallet, chain]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
        signerType: getSignerType(user, privyEmbeddedWallet),
    };
};

/* ============================================================ */
/*                    SOLANA PRIVY CONNECTOR                    */
/* ============================================================ */
export const useSolanaPrivyConnector = () => {
    const { setJwt, crossmint } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet, getOrCreateWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useSolanaWallets();
    const privyEmbeddedWallet = privyWallets?.find((wallet) => wallet.walletClientType === "privy") ?? null;

    useEffect(() => {
        const syncPrivyJwt = async () => {
            try {
                const privyJwt = await getAccessToken();
                if (privyJwt != null) {
                    setJwt(privyJwt);
                }
            } catch (error) {
                setJwt(undefined);
                console.error("Failed to get Privy JWT:", error);
            }
        };

        if (ready && authenticated && privyEmbeddedWallet) {
            syncPrivyJwt();
        }
    }, [ready, authenticated, getAccessToken, privyEmbeddedWallet, setJwt]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        const signerType = getSignerType(user, privyEmbeddedWallet);
        if (!signerType) {
            console.warn("No suitable signer type found for Solana wallet creation");
            return;
        }

        switch (signerType) {
            case "email":
                const email = user?.email?.address ?? user?.google?.email;
                if (email) {
                    createEmailWallet(getOrCreateWallet, "solana" as Chain, email);
                }
                break;
            case "external-wallet":
                if (privyEmbeddedWallet?.address) {
                    createExternalWalletSolana(getOrCreateWallet, privyEmbeddedWallet);
                }
                break;
        }
    }, [crossmint.jwt, user, privyEmbeddedWallet, getOrCreateWallet]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
        signerType: getSignerType(user, privyEmbeddedWallet),
    };
};

/* ============================================================ */
/*                    HELPER FUNCTIONS                          */
/* ============================================================ */

// Helper function to create phone-based wallet
const createPhoneWallet = async (getOrCreateWallet: any, chain: Chain, phone: string) => {
    try {
        await getOrCreateWallet({
            chain,
            signer: {
                type: "phone",
                phone,
            },
        });
    } catch (error) {
        console.error("Failed to create phone wallet:", error);
    }
};

// Helper function to create email-based wallet
const createEmailWallet = async (getOrCreateWallet: any, chain: Chain, email: string) => {
    try {
        await getOrCreateWallet({
            chain,
            signer: {
                type: "email",
                email,
            },
        });
    } catch (error) {
        console.error("Failed to create email wallet:", error);
    }
};

// Helper function to create external wallet (EVM)
const createExternalWalletEVM = async (getOrCreateWallet: any, chain: Chain, privyEmbeddedWallet: any) => {
    try {
        const privyProvider = await privyEmbeddedWallet.getEthereumProvider();
        await getOrCreateWallet({
            chain,
            signer: {
                type: "external-wallet",
                address: privyEmbeddedWallet.address,
                provider: privyProvider,
            },
        });
    } catch (error) {
        console.error("Failed to create external wallet (EVM):", error);
    }
};

// Helper function to create external wallet (Solana)
const createExternalWalletSolana = async (getOrCreateWallet: any, privyEmbeddedWallet: any) => {
    try {
        await getOrCreateWallet({
            chain: "solana",
            signer: {
                type: "external-wallet",
                address: privyEmbeddedWallet.address,
                onSignTransaction: (transaction: VersionedTransaction) => {
                    return privyEmbeddedWallet.signTransaction(transaction);
                },
            },
        });
    } catch (error) {
        console.error("Failed to create external wallet (Solana):", error);
    }
};

// Helper function to determine the best signer type for EVM
const getSignerType = (user: any, privyEmbeddedWallet: any) => {
    if (user?.email?.address || user?.google?.email) {
        return "email";
    }
    if (privyEmbeddedWallet?.address) {
        return "external-wallet";
    }
    if (user?.phone?.number) {
        return "phone";
    }
    return null;
};
