import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthMaterialWithUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "../CrossmintAuthProvider";

type AuthStep = "initial" | "walletMethod" | "otp" | "qrCode";
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
    oauthUrl: OAuthUrlMap;
    isLoadingOauthUrl: boolean;
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
}: { children: ReactNode; initialState: ContextInitialStateProps }) => {
    const [step, setStep] = useState<AuthStep>("initial");
    const [oauthUrl, setOauthUrl] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrl, setIsLoadingOauthUrl] = useState(true);

    const { loginMethods, apiKey, baseUrl } = initialState;

    useEffect(() => {
        const preFetchAndSetOauthUrl = async () => {
            setIsLoadingOauthUrl(true);
            try {
                const oauthProviders = loginMethods.filter(
                    (method): method is OAuthProvider => method in initialOAuthUrlMap
                );

                const OAuthPromiseList = oauthProviders.map(async (provider) => {
                    const url = await getOAuthUrl(provider, { apiKey, baseUrl });
                    return { [provider]: url };
                });

                const oauthUrlMap = Object.assign({}, ...(await Promise.all(OAuthPromiseList)));
                setOauthUrl(oauthUrlMap);
            } catch (error) {
                console.error("Error fetching OAuth URLs:", error);
            } finally {
                setIsLoadingOauthUrl(false);
            }
        };
        preFetchAndSetOauthUrl();
    }, [loginMethods, apiKey, baseUrl]);

    const value: AuthFormContextType = {
        step,
        apiKey,
        baseUrl,
        fetchAuthMaterial: initialState.fetchAuthMaterial,
        appearance: initialState.appearance,
        loginMethods,
        oauthUrl,
        isLoadingOauthUrl,
        setDialogOpen: initialState.setDialogOpen ?? (() => {}),
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
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
