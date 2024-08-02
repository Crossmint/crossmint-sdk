import { useToast } from "@/components/use-toast";
import { getAuthedJWT } from "@/lib/firebase";
import { createOrGetPasskeyWallet } from "@/utils/create-or-get-passkey-wallet";
import { useRouter } from "next/navigation";
import { useContext, useState } from "react";

import { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { AppContext } from "./app-context";

export const useAuth = () => {
    const context = useContext(AppContext);

    if (!context) {
        throw new Error("useAuth must be used within an AppProvider");
    }

    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const login = async () => {
        setIsLoading(true);

        try {
            const jwt = (await getAuthedJWT()) || (await context.signInWithGoogle());
            if (!jwt) {
                throw new Error("No JWT token found");
            }
            const account: EVMSmartWallet = await createOrGetPasskeyWallet(jwt as unknown as string);
            if (!account) {
                toast({
                    title: "Error occurred during account register",
                });
                return;
            }
            context.setSmartWallet(account);
            router.push("/mint");
        } catch (e) {
            return;
        } finally {
            setIsLoading(false);
        }
    };

    return { login, isLoading };
};
