import { Auth0ContextInterface, useAuth0 } from "@auth0/auth0-react";
import { PrivyInterface, usePrivy } from "@privy-io/react-auth";
import { useContext } from "react";

import { AppContext } from "../AppContext";
import { Auth0AuthAdapter } from "../auth/Auth0AuthAdapter";
import { FirebaseAuthAdapter } from "../auth/FirebaseAuthManager";
import { PrivyAuthAdapter } from "../auth/PrivyAuthManager";

interface AuthAdapter {
    login: () => Promise<string>;
    check: () => Promise<string | undefined>;
    logout: () => Promise<void>;
}

export interface AuthProviders {
    auth0: Auth0ContextInterface;
    privy: PrivyInterface;
    // Add more providers here
}

const useAuthProviders: () => AuthProviders = () => {
    return {
        auth0: useAuth0(),
        privy: usePrivy(),
        // Add more providers here
    };
};

export const useAuthProvider = (provider?: string): AuthAdapter => {
    const authProviders = useAuthProviders();
    const { authProviderContext } = useContext(AppContext);
    const desiredAuthProvider = provider ?? authProviderContext ?? "Firebase";

    switch (desiredAuthProvider) {
        case "Firebase":
            return new FirebaseAuthAdapter();
        case "Auth0":
            return new Auth0AuthAdapter(authProviders.auth0);
        case "Privy":
            return new PrivyAuthAdapter(authProviders.privy);
        default:
            throw new Error(`Provider ${provider} not implemented.`);
    }
};
