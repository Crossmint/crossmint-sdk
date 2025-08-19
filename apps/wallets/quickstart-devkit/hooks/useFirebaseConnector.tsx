"use client";

import { useEffect, useState } from "react";
import { useCrossmint, useWallet as useCrossmintWallet } from "@crossmint/client-sdk-react-ui";
import type { User } from "firebase/auth";
import { onAuthStateChange } from "@/lib/firebase";

export const useFirebaseConnector = () => {
    const { wallet: crossmintWallet, status: crossmintWalletStatus } = useCrossmintWallet();

    const { setJwt } = useCrossmint();
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

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

    return {
        user: firebaseUser,
        crossmintWallet,
        crossmintWalletStatus,
        isLoading: crossmintWalletStatus === "in-progress" || isLoading,
    };
};
