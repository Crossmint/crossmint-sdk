"use client";

import AuthModal from "@/components/AuthModal";
import { CrossmintAuthService } from "@/services/CrossmintAuthService";
import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from "react";

import { Crossmint } from "@crossmint/common-sdk-base";

const SESSION_PREFIX = "crossmint-session";

export function getCachedJwt(): string | undefined {
    if (typeof document === "undefined") {
        return undefined; // Check if we're on the client-side
    }
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith(SESSION_PREFIX));
    return crossmintSession ? crossmintSession.split("=")[1] : undefined;
}

type AuthContextType = {
    login: () => void;
    logout: () => void;
    jwt: string | undefined;
};

const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    jwt: undefined,
});

export type AuthProviderParams = {
    setJwtToken: (jwtToken: string | undefined) => void;
    crossmint: Crossmint;
    children: ReactNode;
};

export function AuthProvider({ children, crossmint, setJwtToken }: AuthProviderParams) {
    const [modalOpen, setModalOpen] = useState(false);

    const crossmintService = useMemo(
        () => new CrossmintAuthService(crossmint.apiKey),
        [crossmint.apiKey, crossmint.jwt]
    );

    const login = () => {
        if (crossmint.jwt) {
            console.log("User already logged in");
            return;
        }

        setModalOpen(true);
    };

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        setModalOpen(false);
    }, [crossmint.jwt]);

    const logout = () => {
        document.cookie = `${SESSION_PREFIX}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        setJwtToken(undefined);
    };

    useEffect(() => {
        if (crossmint.jwt) {
            // TODO: WAL-2562: get user data from crossmint
            // setUser({
            //     id: "1",
            //     email: "test@test.com",
            //     name: "Test",
            // });

            document.cookie = `${SESSION_PREFIX}=${crossmint.jwt}; path=/;SameSite=Lax;`;
        }
    }, [crossmint.jwt]);

    return (
        <AuthContext.Provider value={{ login, logout, jwt: crossmint.jwt }}>
            {children}
            {modalOpen && (
                <AuthModal
                    baseUrl={crossmintService.crossmintBaseUrl}
                    setModalOpen={setModalOpen}
                    setJwtToken={setJwtToken}
                    apiKey={crossmint.apiKey}
                />
            )}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
