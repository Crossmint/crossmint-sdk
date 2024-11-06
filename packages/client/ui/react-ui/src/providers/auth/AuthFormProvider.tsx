import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { LoginMethod } from "../CrossmintAuthProvider";
import { useCrossmintAuth } from "@/hooks/useCrossmintAuth";

type AuthStep = "initial" | "walletMethod" | "otp" | "qrCode";
type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    // Farcaster is not included here as it uses a different authentication method
};
interface AuthFormContextType {
    step: AuthStep;
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    baseUrl: string;
    setStep: (step: AuthStep) => void;
    setDialogOpen: (open: boolean) => void;
}

type ContextInitialStateProps = {
    appearance?: UIConfig;
    loginMethods: LoginMethod[];
    baseUrl: string;
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
    const { crossmintAuth } = useCrossmintAuth();
    const [step, setStep] = useState<AuthStep>("initial");
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);

    const { loginMethods } = initialState;

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
        } finally {
            setIsLoadingOauthUrlMap(false);
        }
    }, [loginMethods, crossmintAuth]);

    useEffect(() => {
        preFetchAndSetOauthUrl();
    }, [preFetchAndSetOauthUrl]);

    const value: AuthFormContextType = {
        step,
        appearance: initialState.appearance,
        loginMethods,
        baseUrl: initialState.baseUrl,
        oauthUrlMap,
        isLoadingOauthUrlMap,
        setDialogOpen: initialState.setDialogOpen ?? (() => {}),
        setStep,
    };

    return <AuthFormContext.Provider value={value}>{children}</AuthFormContext.Provider>;
};
