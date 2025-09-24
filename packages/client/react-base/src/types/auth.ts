import type { ReactNode, MouseEvent } from "react";

export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";

export type CrossmintAuthBaseContextType = {
    crossmintAuth?: any;
    login: (defaultEmail?: string | MouseEvent) => void;
    logout: () => void;
    jwt?: string;
    user?: any;
    status: AuthStatus;
    getUser: () => void;
};

export type CrossmintAuthBaseProviderProps = {
    children: ReactNode;
    onLoginSuccess?: () => void;
    refreshRoute?: string;
    logoutRoute?: string;
    storageProvider?: any;
};
