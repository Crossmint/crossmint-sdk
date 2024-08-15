import { Auth0Provider as Auth0AuthProvider } from "@auth0/auth0-react";
import { PrivyProvider as PrivyAuthProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

function PrivyProvider({ children }: { children: ReactNode }) {
    return (
        <PrivyAuthProvider
            appId="clz8iksv40d95odgp6jcai4vp"
            config={{
                // Customize Privy's appearance in your app
                appearance: {
                    theme: "light",
                    accentColor: "#676FFF",
                    logo: "https://cdn.prod.website-files.com/653a93effa45d5e5a3b8e1e8/653b06fbe475503198236e11_LOGO.svg",
                },
                // Create embedded wallets for users who don't have a wallet
                embeddedWallets: {
                    createOnLogin: "users-without-wallets",
                },
            }}
        >
            {children}
        </PrivyAuthProvider>
    );
}

function Auth0Provider({ children }: { children: ReactNode }) {
    return (
        <Auth0AuthProvider
            domain="dev-kxzagucpp8zdb87p.us.auth0.com"
            clientId="P7SII252F2qKo81USpInSKNbrmx7mMuG"
            authorizationParams={{
                redirect_uri: window.location.origin,
            }}
        >
            {children}
        </Auth0AuthProvider>
    );
}

export function ConfiguredAuthProviders({ children }: { children: ReactNode }) {
    return (
        /* Add more providers here... */
        <Auth0Provider>
            <PrivyProvider>{children}</PrivyProvider>
        </Auth0Provider>
    );
}
