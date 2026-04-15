"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

export function AuthButton() {
    const { login, logout, user } = useCrossmintAuth();

    if (user) {
        return (
            <button className="xm-btn xm-btn--ghost" onClick={logout}>
                Log out
            </button>
        );
    }

    return (
        <button className="xm-btn xm-btn--primary" onClick={login}>
            Sign In
        </button>
    );
}
