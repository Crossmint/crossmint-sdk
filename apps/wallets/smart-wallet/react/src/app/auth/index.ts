import { AuthProviders } from "../providers/Providers";
import { Auth0AuthAdapter } from "./Auth0AuthAdapter";
import { FirebaseAuthAdapter } from "./FirebaseAuthManager";
import { PrivyAuthAdapter } from "./PrivyAuthManager";

export interface AuthAdapter {
    login: () => Promise<string>;
    check: () => Promise<string | undefined>;
    logout: () => Promise<void>;
}

export class AuthStrategy {
    static forProvider(provider: string, providers: AuthProviders): AuthAdapter {
        switch (provider) {
            case "Firebase":
                return new FirebaseAuthAdapter();
            case "Auth0":
                return new Auth0AuthAdapter(providers.auth0);
            case "Privy":
                return new PrivyAuthAdapter(providers.privy);
            default:
                throw new Error(`Provider ${provider} not implemented.`);
        }
    }
}
