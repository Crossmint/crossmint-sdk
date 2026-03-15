"use client";

import { useEffect, useState } from "react";
import { type Chain, useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import type { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";

export const useFirebaseConnector = (chain: Chain) => {
    const { wallet: crossmintWallet, status: crossmintWalletStatus, createWallet } = useCrossmintWallet();

    const { setJwt, crossmint } = useCrossmint();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    // Phase 2: Create wallet once JWT is available
    useEffect(() => {
        if (crossmint.jwt == null || firebaseUser == null) {
            return;
        }

        const email = firebaseUser.email;
        const phone = firebaseUser.phoneNumber;

        if (email != null) {
            createWallet({
                chain,
                recovery: { type: "email", email },
            });
        } else if (phone != null) {
            createWallet({
                chain,
                recovery: { type: "phone", phone },
            });
        }
    }, [crossmint.jwt, firebaseUser, chain, createWallet]);

    return {
        user: firebaseUser,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || isLoading,
    };
};
