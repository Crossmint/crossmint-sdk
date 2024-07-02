import AuthModal from "@/components/AuthModal";
import { CrossmintService, FetchCrossmintParams } from "@/services/CrossmintService";
import { CrossmintEnvironment } from "@/utils";
import { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type AuthContextType = {
    user: User | null;
    login: () => void;
    logout: () => void;
    fetchCrossmintAPI: (fetchCrossmintParams: FetchCrossmintParams) => Promise<any> | void;
    jwt: string | null;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    fetchCrossmintAPI: () => { },
    jwt: null,
});

//TODO: define user interface
type User = {
    id: string;
    email: string;
    name: string;
}

type AuthProviderParams = {
    apiKey: string;
    environment: CrossmintEnvironment;
    children: ReactNode;
};


export function AuthProvider({ children, apiKey, environment }: AuthProviderParams) {
    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const crossmintService = useMemo(() => new CrossmintService(jwtToken, environment), [jwtToken, environment]);

    useEffect(() => {
        const crossmintSession = document.cookie.split('; ').find(row => row.startsWith('crossmint-session'));
        const crossmintSessionCookie = crossmintSession ? crossmintSession.split('=')[1] : null;
        if (crossmintSessionCookie) {
            setJwtToken(crossmintSessionCookie);
            // here we should check how to get the user data
        }
    }, []);

    const login = () => {
        setModalOpen(true);
    };

    useEffect(() => {
        if (jwtToken == null) {
            return
        }

        setModalOpen(false);
    }, [modalOpen, jwtToken]);



    const logout = () => {
        document.cookie = "crossmint-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        setJwtToken(null);
        setUser(null);
    };

    const fetchCrossmintAPI = useCallback((fetchCrossmintParams: FetchCrossmintParams) => {
        if (jwtToken == null) {
            throw new Error("jwtToken is not set");
        }

        return crossmintService.fetchCrossmintAPI(fetchCrossmintParams,);
    }, [jwtToken, environment]);

    useEffect(() => {
        if (jwtToken) {
            // todo make endpoint in crossmint that returns the user associated with the jwtToken
            // also, define the interface that we want to share
            setUser({
                id: "1",
                email: "test@test.com",
                name: "Test",
            });

            document.cookie = `crossmint-session=${jwtToken}; path=/;`
            console.log("cookie", document.cookie);
        }
    }, [jwtToken]);

    return (
        <AuthContext.Provider value={{ user, login, logout, fetchCrossmintAPI, jwt: jwtToken }}>
            {children}
            {modalOpen && <AuthModal baseUrl={crossmintService.crossmintBaseUrl} setModalOpen={setModalOpen} setJwtToken={setJwtToken} apiKey={apiKey} />}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
