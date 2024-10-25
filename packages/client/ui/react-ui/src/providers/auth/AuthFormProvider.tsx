import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthMaterialWithUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "../CrossmintAuthProvider";
import { WagmiAuthProvider } from "./web3/WagmiAuthProvider";

type AuthStep = "initial" | "otp" | "qrCode" | "web3";

type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    // Farcaster is not included here as it uses a different authentication method
};
interface AuthFormContextType {
    step: AuthStep;
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterialWithUser>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    setStep: (step: AuthStep) => void;
    setDialogOpen: (open: boolean) => void;
}

type ContextInitialStateProps = {
    apiKey: string;
    baseUrl: string;
    fetchAuthMaterial: (refreshToken: string) => Promise<AuthMaterialWithUser>;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    setDialogOpen?: (open: boolean) => void;
};

const AuthFormContext = createContext<AuthFormContextType | undefined>(undefined);

export const useAuthForm = () => {
    const context = useContext(AuthFormContext);
    if (!context) {
        throw new Error("useAuthForm must be used within an AuthFormProvider");
    }
    return context;
};

export const AuthFormProvider = ({
    children,
    initialState,
    walletConnectProjectId,
}: { children: ReactNode; initialState: ContextInitialStateProps; walletConnectProjectId?: string }) => {
    const [step, setStep] = useState<AuthStep>("initial");
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { loginMethods, apiKey, baseUrl } = initialState;

    useEffect(() => {
        const preFetchAndSetOauthUrl = async () => {
            setIsLoadingOauthUrlMap(true);
            try {
                const oauthProviders = loginMethods.filter(
                    (method): method is OAuthProvider => method in initialOAuthUrlMap
                );

                const oauthPromiseList = oauthProviders.map(async (provider) => {
                    const url = await getOAuthUrl(provider, { apiKey, baseUrl });
                    return { [provider]: url };
                });

                const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
                setOauthUrlMap(oauthUrlMap);
            } catch (error) {
                console.error("Error fetching OAuth URLs:", error);
            } finally {
                setIsLoadingOauthUrlMap(false);
            }
        };
        preFetchAndSetOauthUrl();
    }, [loginMethods, apiKey, baseUrl]);

    const handleToggleDialog = (open: boolean) => {
        initialState.setDialogOpen?.(open);
        if (!open) {
            // Delay to allow the close transition to complete before resetting the step
            setTimeout(() => setStep("initial"), 250);
        }
    };

    const value: AuthFormContextType = {
        step,
        apiKey,
        baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance: initialState.appearance,
        loginMethods,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        setDialogOpen: handleToggleDialog,
        setStep,
    };

    return (
        <AuthFormContext.Provider value={value}>
            <WagmiAuthProvider walletConnectProjectId={walletConnectProjectId}>{children}</WagmiAuthProvider>
        </AuthFormContext.Provider>
    );
};

async function getOAuthUrl(provider: OAuthProvider, options: { baseUrl: string; apiKey: string }) {
    try {
        const queryParams = new URLSearchParams({ apiKey: options.apiKey });
        const response = await fetch(
            `${options.baseUrl}api/2024-09-26/session/sdk/auth/social/${provider}/start?${queryParams}`
        );

        if (!response.ok) {
            throw new Error("Failed to get OAuth URL. Please try again or contact support.");
        }

        const data = (await response.json()) as { oauthUrl: string };
        return data.oauthUrl;
    } catch (error) {
        console.error(`Error fetching OAuth URL for ${provider}:`, error);
        throw new Error(`Failed to get OAuth URL for ${provider}. Please try again or contact support.`);
    }
}
