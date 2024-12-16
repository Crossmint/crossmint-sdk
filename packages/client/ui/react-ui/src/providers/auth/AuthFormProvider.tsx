import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { CrossmintAuthWalletConfig, LoginMethod } from "../CrossmintAuthProvider";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";

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
    loginMethods: LoginMethod[];
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    baseUrl: string;
    setStep: (step: AuthStep) => void;
    setError: (error: string | null) => void;
    setDialogOpen: (open: boolean) => void;
}

type ContextInitialStateProps = {
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    baseUrl: string;
    setDialogOpen?: (open: boolean) => void;
    embeddedWallets: CrossmintAuthWalletConfig;
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
    const { crossmintAuth } = useCrossmintAuth();
    const [step, setStep] = useState<AuthStep>("initial");
    const [error, setError] = useState<string | null>(null);
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { loginMethods, baseUrl, setDialogOpen, appearance, embeddedWallets } = initialState;

    if (loginMethods.includes("web3") && embeddedWallets?.createOnLogin === "all-users") {
        throw new Error("Creating wallets on login is not yet supported for web3 login method");
    }

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
            console.error("Error fetching OAuth URLs:", error);
            setError("Unable to load oauth providers. Please try again later.");
        } finally {
            setIsLoadingOauthUrlMap(false);
        }
    }, [loginMethods, crossmintAuth]);

    useEffect(() => {
        preFetchAndSetOauthUrl();
    }, [preFetchAndSetOauthUrl]);

    const handleToggleDialog = (open: boolean) => {
        setDialogOpen?.(open);
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
        loginMethods,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        setDialogOpen: handleToggleDialog,
        setError,
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
