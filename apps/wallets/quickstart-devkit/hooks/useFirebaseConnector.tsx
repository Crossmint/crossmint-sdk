"use client";

import { useEffect, useState } from "react";
import { type Chain, useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import type { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";

export const useFirebaseConnector = () => {
    const { wallet: crossmintWallet, status: crossmintWalletStatus, createWallet, getWallet } = useCrossmintWallet();

    const { setJwt, crossmint } = useCrossmint();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const chain = process.env.NEXT_PUBLIC_EVM_CHAIN as Chain;

    // Phase 1: Sync JWT from Firebase auth
    useEffect(() => {
        const unsubscribe = onAuthStateChange(async (user) => {
            setFirebaseUser(user);
            if (user == null) {
                setIsLoading(false);
                return;
            }

            try {
                const token = await user.getIdToken();
                setJwt(token);
            } catch (error) {
                console.error("Failed to get Firebase JWT:", error);
                setJwt(undefined);
            } finally {
                setIsLoading(false);
            }
        });

        return () => unsubscribe?.();
    }, [setJwt]);

    // Phase 2: Get or create wallet once JWT is available
    useEffect(() => {
        if (
            crossmint.jwt == null ||
            firebaseUser == null ||
            crossmintWallet != null ||
            crossmintWalletStatus === "in-progress"
        ) {
            return;
        }

        const email = firebaseUser.email;
        const phone = firebaseUser.phoneNumber;

        const syncWallet = async () => {
            try {
                const wallet = await getWallet({ chain });
                if (wallet != null) {
                    return wallet;
                }

                if (email != null) {
                    return await createWallet({
                        chain,
                        recovery: { type: "email", email },
                    });
                }

                if (phone != null) {
                    return await createWallet({
                        chain,
                        recovery: { type: "phone", phone },
                    });
                }
            } catch (error) {
                console.error("Failed to get or create Firebase wallet:", error);
            }
        };

        syncWallet();
    }, [crossmint.jwt, firebaseUser, chain, createWallet, getWallet, crossmintWallet, crossmintWalletStatus]);

    return {
        user: firebaseUser,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || isLoading,
    };
};
