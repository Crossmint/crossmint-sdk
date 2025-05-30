import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CrossmintAuthenticationError, type OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";
import type { BaseCrossmintWalletProviderProps, LoginMethod } from "@/types/auth";

type AuthStep = "initial" | "otp" | "qrCode" | "web3" | "web3/metamask" | "web3/walletconnect";

type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    twitter: "",
    // Farcaster is not included here as it uses a different authentication method
};
interface AuthFormContextType {
    step: AuthStep;
    error: string | null;
    appearance?: UIConfig;
    termsOfServiceText?: string | ReactNode;
    authModalTitle?: string;
    loginMethods: LoginMethod[];
    defaultEmail?: string;
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    baseUrl: string;
    setStep: (step: AuthStep) => void;
    setError: (error: string | null) => void;
    setDialogOpen: (open: boolean, successfulLogin?: boolean) => void;
}

type ContextInitialStateProps = {
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    termsOfServiceText?: string | ReactNode;
    authModalTitle?: string;
    createOnLogin?: BaseCrossmintWalletProviderProps;
    baseUrl: string;
    defaultEmail?: string;
};

type AuthFormProviderProps = {
    setDialogOpen?: (open: boolean, successfulLogin?: boolean) => void;
    preFetchOAuthUrls: boolean;
    initialState: ContextInitialStateProps;
    children: ReactNode;
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
    setDialogOpen,
    preFetchOAuthUrls,
    initialState,
    children,
}: AuthFormProviderProps) => {
    const { crossmintAuth } = useCrossmintAuth();
    const [step, setStep] = useState<AuthStep>("initial");
    const [error, setError] = useState<string | null>(null);
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { loginMethods, baseUrl, appearance, termsOfServiceText, authModalTitle, defaultEmail } = initialState;

    const preFetchAndSetOauthUrl = useCallback(async () => {
        setIsLoadingOauthUrlMap(true);
        try {
            const oauthProviders = loginMethods.filter(
                (method): method is OAuthProvider => method in initialOAuthUrlMap
            );

            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await crossmintAuth?.getOAuthUrl(provider);
                return { [provider]: url };
            });

            const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setOauthUrlMap(oauthUrlMap);
        } catch (error) {
            setError(
                error instanceof CrossmintAuthenticationError
                    ? error.message
                    : "Unable to load oauth providers. Please try again later."
            );
        } finally {
            setIsLoadingOauthUrlMap(false);
        }
    }, [loginMethods, crossmintAuth]);

    useEffect(() => {
        // Only pre-fetch oauth urls if the user is not logged in
        if (preFetchOAuthUrls) {
            preFetchAndSetOauthUrl();
        }
    }, [preFetchAndSetOauthUrl, preFetchOAuthUrls]);

    const handleToggleDialog = (open: boolean, successfulLogin?: boolean) => {
        setDialogOpen?.(open, successfulLogin);
        if (!open) {
            // Delay to allow the close transition to complete before resetting the step
            setTimeout(() => setStep("initial"), 250);
        }
    };

    const value: AuthFormContextType = {
        step,
        error,
        baseUrl,
        appearance,
        termsOfServiceText,
        authModalTitle,
        loginMethods,
        defaultEmail,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        setDialogOpen: handleToggleDialog,
        setError,
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
