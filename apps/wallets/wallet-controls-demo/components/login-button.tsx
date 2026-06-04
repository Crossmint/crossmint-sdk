"use client";

import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";

export function CrossmintAuthLoginButton() {
    const { login } = useCrossmintAuth();

    return (
        <button
            onClick={login}
            className="w-full py-2 px-4 rounded-md text-sm font-medium bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
        >
            Sign in with Crossmint
        </button>
    );
}
