import { IFrameWindow } from "@crossmint/client-sdk-window";
import { ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { z } from "zod";

type AuthContextType = {
    user: User | null;
    login: () => void;
    logout: () => void;
    sendApiEventToCrossmint: (sendEventToCrossmintParams: SendEventToCrossmintParams) => Promise<any> | void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    login: () => { },
    logout: () => { },
    sendApiEventToCrossmint: (sendEventToCrossmintParams: SendEventToCrossmintParams) => { },
});

const API_KEY_DEV =
    "sk_development_5YYrpjxndZpS3BYC2gLE8DrTxDTe9HdgrYTQczPxRto41rUD1jZ5zhPskCxPmc1k9zxi2UP8c2BUeguM35tTTdh5HMmsHfeiXZqGWBcmos7nH6SHR5rjdjBjw8JpkP148kuFHkS5o2ZQcf1JK19kkcUeeoeYcxBgJYHxSqy78v1UA68CQX212FQ6Ej7Uj8pS1JyE4ugNnUAXEgCbiharpcpS";

type SendEventToCrossmintParams = {
    route: string;
    config: {
        method: string;
        body?: any;
    };
}

type CommunicationIframeProps = SendEventToCrossmintParams & {
    jwtToken: string;
    callback: (data: any) => void;
};

//TODO: define user interface
type User = {
    id: string;
    email: string;
    name: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [jwtToken, setJwtToken] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [communicationIframeParams, setCommunicationParams] = useState<CommunicationIframeProps | null>(null);
    const [user, setUser] = useState<User | null>(null);


    const login = () => {
        setModalOpen(true);
    };

    const logout = () => {
        setJwtToken(null);
    };

    const sendApiEventToCrossmint = useCallback((communicationParams: SendEventToCrossmintParams) => {
        return new Promise((resolve, reject) => {
            if (!jwtToken) {
                reject(new Error("jwtToken is not set"));
                return;
            }

            setCommunicationParams({
                ...communicationParams,
                jwtToken,
                callback: resolve, // Resolve the promise when the callback is called
            });
        });
    }, [jwtToken]);

    useEffect(() => {
        if (jwtToken) {
            // todo make endpoint in crossmint that returns the user associated with the jwtToken
            // also, define the interface that we want to share
            setUser({
                id: "1",
                email: "test@test.com",
                name: "Test",
            });
        }
    }, [jwtToken]);


    return (
        <AuthContext.Provider value={{ user, login, logout, sendApiEventToCrossmint }}>
            {children}
            {modalOpen && <AuthModal setModalOpen={setModalOpen} setJwtToken={setJwtToken} />}
            {jwtToken && <CommunicationIframe communicationIframeParams={communicationIframeParams} />}
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

const incomingModalIframeEvents = {
    jwtToken: z.object({
        jwtToken: z.string(),
    }),
};

type IncomingModalIframeEventsType = {
    jwtToken: typeof incomingModalIframeEvents.jwtToken;
};

function AuthModal({
    setModalOpen,
    setJwtToken,
}: {
    setModalOpen: (open: boolean) => void;
    setJwtToken: (jwtToken: string) => void;
}) {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframe, setIframe] = useState<IFrameWindow<IncomingModalIframeEventsType, {}> | null>(null);

    useEffect(() => {
        if (!iframeRef.current) {
            return;
        }

        (async () => {
            const initIframe = await IFrameWindow.init(`http://localhost:3000/sdk/auth/frame`, {
                existingIFrame: iframeRef.current,
                incomingEvents: {
                    jwtToken: z.object({
                        jwtToken: z.string(),
                    })
                }
            });
            console.log("iframe", initIframe);
            setIframe(initIframe);
        })();
    }, [iframeRef.current]);

    useEffect(() => {
        console.log("iframe", iframe);

        if (!iframe) {
            return;
        }
        iframe.on("jwtToken", data => {
            console.log("jwtToken in sdk mock page", data);
            setJwtToken(data.jwtToken);
            setModalOpen(false);
        });
    }, [iframe]);

    const iframeSrc = `http://localhost:3000/sdk/auth/frame?api_key=${API_KEY_DEV}`;

    return (
        <div className="flex flex-col items-center w-full">
            <iframe ref={iframeRef} src={iframeSrc} className="w-[300px] h-[100px]" />
        </div>
    );
}

const incomingCommunicationIframeEvents = {
    apiResponse: z.object({
        data: z.any(),
    }),
}

const outgoingCommunicationIframeEvents = {
    api: z.object({
        jwt: z.string(),
        route: z.string(),
        config: z.object({
            method: z.string(),
            body: z.any(),
        }),
    }),
}

type IncomingCommunicationIframeEventsType = {
    apiResponse: typeof incomingCommunicationIframeEvents.apiResponse;
}

type OutgoingCommunicationIframeEventsType = {
    api: typeof outgoingCommunicationIframeEvents.api;
}

function CommunicationIframe({ communicationIframeParams }: { communicationIframeParams: CommunicationIframeProps | null }) {
    /**
     * This will be a component to communicate with Crossmint API.
     * So, it will be an iframe that will point to this communication component on the crossbit side
     * There I will expect to receive a jwt, a route, and a config.
     * the config will have all the necessary to make the request, lets say a method and a body for now.
     */
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [iframe, setIframe] = useState<IFrameWindow<IncomingCommunicationIframeEventsType, OutgoingCommunicationIframeEventsType> | null>(null);

    console.log("communicationParams", communicationIframeParams);
    useEffect(() => {
        if (!iframeRef.current) {
            return;
        }

        (async () => {
            const initIframe = await IFrameWindow.init(`http://localhost:3000/sdk/auth/communication`, {
                existingIFrame: iframeRef.current,
                outgoingEvents: outgoingCommunicationIframeEvents,
                incomingEvents: incomingCommunicationIframeEvents,
            });

            setIframe(initIframe);
        })();
    }, [iframeRef.current]);

    useEffect(() => {
        if (!iframe) {
            return;
        }

        iframe.on("apiResponse", (data) => {
            console.log("apiResponse in sdk mock page", data);
            console.log("callback", communicationIframeParams);
            communicationIframeParams?.callback(data);
        });


    }, [iframe, communicationIframeParams]);


    useEffect(() => {
        if (iframe == null || communicationIframeParams == null) {
            return;
        }

        console.log("sending api event", communicationIframeParams);

        // send the api event here
        iframe.send("api", {
            jwt: communicationIframeParams.jwtToken,
            route: communicationIframeParams.route,
            config: {
                method: communicationIframeParams.config.method,
                body: communicationIframeParams.config.body,
            },
        });
    }, [communicationIframeParams]);

    const iframeSrc = `http://localhost:3000/sdk/auth/communication`;

    return (
        <div style={
            {
                position: "absolute",
                display: "none",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                zIndex: -1,
            }
        }>
            <iframe ref={iframeRef} src={iframeSrc} />
        </div>
    );
}
