"use client";

import { useEffect } from "react";
import { useCrossmint, useWallet as useCrossmintWallet, type Chain } from "@crossmint/client-sdk-react-ui";
import { usePrivy, useSolanaWallets, useWallets as usePrivyWallets } from "@privy-io/react-auth";
import type { VersionedTransaction } from "@solana/web3.js";

type PrivyEmbeddedWallet = {
    address: string;
    getEthereumProvider: () => Promise<{
        request: (args: { method: string; params: string[] }) => Promise<unknown>;
    }>;
    signTransaction: (transaction: VersionedTransaction) => Promise<VersionedTransaction>;
};
type PrivyUser = {
    email?: { address?: string | null } | null;
    google?: { email?: string | null } | null;
    phone?: { number?: string | null } | null;
};

/* ============================================================ */
/*                    EVM PRIVY CONNECTOR                       */
/* ============================================================ */
export const useEVMPrivyConnector = () => {
    const { setJwt, crossmint } = useCrossmint();
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet, getWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = usePrivyWallets();
    const privyEmbeddedWallet =
        (privyWallets?.find((wallet) => wallet.walletClientType === "privy") as PrivyEmbeddedWallet | undefined) ?? null;
    const chain = process.env.NEXT_PUBLIC_EVM_CHAIN as Chain;

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
        if (crossmint.jwt == null || crossmintWallet != null || crossmintWalletStatus === "in-progress") {
            return;
        }

        const signerType = getSignerType(user, privyEmbeddedWallet);
        if (signerType == null) {
            console.warn("No suitable signer type found for EVM wallet creation");
            return;
        }

        const syncWallet = async () => {
            try {
                const wallet = await getWallet({ chain });
                if (wallet != null) {
                    return wallet;
                }

                switch (signerType) {
                    case "phone":
                        const phone = user?.phone?.number;
                        if (phone == null) {
                            return;
                        }
                        return await createWallet({
                            chain,
                            recovery: {
                                type: "phone",
                                phone,
                            },
                        });
                    case "email":
                        const email = user?.email?.address ?? user?.google?.email;
                        if (email == null) {
                            return;
                        }
                        return await createWallet({
                            chain,
                            recovery: {
                                type: "email",
                                email,
                            },
                        });
                    case "external-wallet":
                        if (privyEmbeddedWallet == null) {
                            return;
                        }
                        const privyProvider = await privyEmbeddedWallet.getEthereumProvider();
                        return await createWallet({
                            chain,
                            recovery: {
                                type: "external-wallet",
                                address: privyEmbeddedWallet.address,
                                onSign: async (payload: string) => {
                                    const result = await privyProvider.request({
                                        method: "personal_sign",
                                        params: [payload, privyEmbeddedWallet.address],
                                    });
                                    return result as string;
                                },
                            },
                        });
                }
            } catch (error) {
                console.error("Failed to get or create Privy EVM wallet:", error);
            }
        };

        syncWallet();
    }, [crossmint.jwt, user, privyEmbeddedWallet, createWallet, getWallet, chain, crossmintWallet, crossmintWalletStatus]);

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
    const { status: crossmintWalletStatus, wallet: crossmintWallet, createWallet, getWallet } = useCrossmintWallet();

    const { ready, authenticated, getAccessToken, user } = usePrivy();
    const { wallets: privyWallets, ready: privyReady } = useSolanaWallets();
    const privyEmbeddedWallet =
        (privyWallets?.find((wallet) => wallet.walletClientType === "privy") as PrivyEmbeddedWallet | undefined) ?? null;

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
        if (crossmint.jwt == null || crossmintWallet != null || crossmintWalletStatus === "in-progress") {
            return;
        }

        const signerType = getSignerType(user, privyEmbeddedWallet);
        if (signerType == null) {
            console.warn("No suitable signer type found for Solana wallet creation");
            return;
        }

        const syncWallet = async () => {
            try {
                const wallet = await getWallet({ chain: "solana" });
                if (wallet != null) {
                    return wallet;
                }

                switch (signerType) {
                    case "email":
                        const email = user?.email?.address ?? user?.google?.email;
                        if (email == null) {
                            return;
                        }
                        return await createWallet({
                            chain: "solana",
                            recovery: {
                                type: "email",
                                email,
                            },
                        });
                    case "external-wallet":
                        if (privyEmbeddedWallet == null) {
                            return;
                        }
                        return await createWallet({
                            chain: "solana",
                            recovery: {
                                type: "external-wallet",
                                address: privyEmbeddedWallet.address,
                                onSign: (transaction: VersionedTransaction) => {
                                    return privyEmbeddedWallet.signTransaction(transaction);
                                },
                            },
                        });
                }
            } catch (error) {
                console.error("Failed to get or create Privy Solana wallet:", error);
            }
        };

        syncWallet();
    }, [crossmint.jwt, user, privyEmbeddedWallet, createWallet, getWallet, crossmintWallet, crossmintWalletStatus]);

    return {
        privyEmbeddedWallet,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || !privyReady,
        signerType: getSignerType(user, privyEmbeddedWallet),
    };
};

// Helper function to determine the best signer type for EVM
const getSignerType = (user: PrivyUser | null | undefined, privyEmbeddedWallet: PrivyEmbeddedWallet | null) => {
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
