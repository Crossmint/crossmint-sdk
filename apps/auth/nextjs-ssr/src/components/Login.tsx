"use client";

import { useState } from "react";
import { useAuth } from "@crossmint/client-sdk-react-ui";
import { useRouter } from "next/navigation";

export default function Login() {
    const router = useRouter();
    const { login, logout, user, status } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            await login();
            router.refresh();
        } catch (error) {
            console.error("Login failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        setIsLoading(true);
        try {
            await logout();
            router.refresh();
        } catch (error) {
            console.error("Logout failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {status === "logged-in" ? (
                <>
                    <p>Welcome, User ID: {user?.id}</p>
                    <button
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                        {isLoading ? "Logging out..." : "Logout"}
                    </button>
                </>
            ) : (
                <button
                    onClick={handleLogin}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                    {isLoading ? "Logging in..." : "Login with Crossmint"}
                </button>
            )}
        </div>
    );
}
