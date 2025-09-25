import { useContext } from "react";
import { CrossmintAuthBaseContext } from "@/providers";
import type { CrossmintAuthBaseContextType } from "@/types";

export function useCrossmintAuth(): CrossmintAuthBaseContextType {
    const context = useContext(CrossmintAuthBaseContext);
    if (!context) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}

export const useAuth = useCrossmintAuth;
