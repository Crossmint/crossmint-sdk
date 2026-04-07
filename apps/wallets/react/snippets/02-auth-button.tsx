"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

export function AuthButton() {
    const { login, logout, user } = useCrossmintAuth();

    if (user) {
        return (
            <button className="qs-btn qs-btn--ghost" onClick={logout}>
                Log out
            </button>
        );
    }

    return (
        <button className="qs-btn qs-btn--primary" onClick={login}>
            Sign In
        </button>
    );
}
