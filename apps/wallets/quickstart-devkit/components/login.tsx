"use client";

import { signInWithGoogle } from "@/lib/firebase";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import { DynamicWidget } from "@dynamic-labs/sdk-react-core";
import { usePrivy } from "@privy-io/react-auth";

/* ============================================================ */
/*                    CROSSMINT AUTH LOGIN BUTTON               */
/* ============================================================ */
export function CrossmintAuthLoginButton() {
    const { login } = useAuth();
    return (
        <button
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={login}
        >
            Connect wallet (Crossmint Auth)
        </button>
    );
}

/* ============================================================ */
/*                    DYNAMIC LABS LOGIN BUTTON                  */
/* ============================================================ */
export function DynamicLabsLoginButton() {
    return (
        <div className="w-full justify-items-center">
            <DynamicWidget />
        </div>
    );
}

/* ============================================================ */
/*                    PRIVY LOGIN BUTTON                        */
/* ============================================================ */
export function PrivyLoginButton() {
    const { login } = usePrivy();
    return (
        <button
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={login}
        >
            Connect wallet (Privy)
        </button>
    );
}

export function FirebaseLoginButton() {
    const handleLogin = async () => {
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Error logging in:", error);
        }
    };
    return (
        <button
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={handleLogin}
        >
            Connect wallet (Firebase)
        </button>
    );
}
