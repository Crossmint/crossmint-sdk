import { Auth0ContextInterface, useAuth0 } from "@auth0/auth0-react";
import { PrivyInterface, usePrivy } from "@privy-io/react-auth";
import React, { ComponentType, ReactNode, Suspense } from "react";

// List of provider file paths
const providerFiles: string[] = [
    "./auth0",
    "./privy",
    // Add more providers here
];

export interface AuthProviders {
    auth0: Auth0ContextInterface;
    privy: PrivyInterface;
    // Add more providers here
}

export const useAuthProviders: () => AuthProviders = () => {
    return {
        auth0: useAuth0(),
        privy: usePrivy(),
        // Add more providers here
    };
};

const lazyProviders = providerFiles.map((file) => {
    const Provider = React.lazy(() => import(`${file}`));
    return ({ children }: { children: ReactNode }) => (
        <Suspense fallback={<div>Loading...</div>}>
            <Provider>{children}</Provider>
        </Suspense>
    );
});

export const withProviders = (Component: ComponentType) => {
    const Providers = lazyProviders.reduce(
        (AccumulatedProviders, Provider) => {
            return ({ children }: { children: ReactNode }) => (
                <Provider>
                    <AccumulatedProviders>{children}</AccumulatedProviders>
                </Provider>
            );
        },
        ({ children }: { children: ReactNode }) => <>{children}</>
    );

    return (props: any) => (
        <Providers>
            <Component {...props} />
        </Providers>
    );
};
