import { useToast } from "@/components/use-toast";
import { auth, getAuthedJWT, onAuthStateChanged, signInWithGoogle } from "@/lib/firebase";
import { createOrGetPasskeyWallet } from "@/utils/create-or-get-passkey-wallet";
import { User, signOut as firebaseSignOut } from "firebase/auth";
import { useEffect, useState } from "react";

export const useAuth = () => {
    const { toast } = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [authedUser, setAuthedUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthedUser(user);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setAuthedUser(null);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const signInAndGetOrCreateWallet = async () => {
        setIsLoading(true);

        try {
            const jwt = (await getAuthedJWT()) || (await signInWithGoogle());
            if (!jwt) {
                toast({
                    title: "Error occurred during sign in",
                });
                throw new Error("No JWT token found");
            }
            const smartWallet = await createOrGetPasskeyWallet(jwt);
            return smartWallet;
        } catch (error) {
            console.error(error);
            return;
        } finally {
            setIsLoading(false);
        }
    };

    return { signOut, signInAndGetOrCreateWallet, isLoading, authedUser };
};
