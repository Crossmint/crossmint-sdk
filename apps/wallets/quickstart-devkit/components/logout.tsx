"use client";

import { signOutUser } from "@/lib/firebase";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import { usePrivy } from "@privy-io/react-auth";

/* ============================================================ */
/*                    CROSSMINT AUTH LOGOUT BUTTON              */
/* ============================================================ */
export function CrossmintAuthLogoutButton() {
    const { logout } = useAuth();
    return (
        <button
            data-testid="logout-button"
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={logout}
        >
            Log out (Crossmint Auth)
        </button>
    );
}

/* ============================================================ */
/*                    PRIVY LOGOUT BUTTON                       */
/* ============================================================ */
export function PrivyLogoutButton() {
    const { logout } = usePrivy();
    return (
        <button
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={() => {
                logout().then(() => {
                    window.location.reload();
                });
            }}
        >
            Log out (Privy)
        </button>
    );
}

export function FirebaseLogoutButton() {
    const handleLogout = async () => {
        try {
            await signOutUser();
            window.location.reload();
        } catch (error) {
            console.error("Error logging out:", error);
        }
    };

    return (
        <button
            className="w-full py-2 px-4 rounded-md text-sm font-medium border bg-gray-50 hover:bg-gray-100 transition-colors"
            onClick={handleLogout}
        >
            Log out (Firebase)
        </button>
    );
}
