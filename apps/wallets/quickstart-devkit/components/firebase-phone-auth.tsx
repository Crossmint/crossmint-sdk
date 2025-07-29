import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, PhoneAuthProvider } from "firebase/auth";
import "firebaseui/dist/firebaseui.css";
import "firebase/compat/auth";
import compatApp from "firebase/compat/app";
import { firebaseConfig } from "@/lib/firebase";

const uiConfig = {
    signInFlow: "popup",
    signInSuccessUrl: "/",
    signInOptions: [PhoneAuthProvider.PROVIDER_ID],
};

export function FirebaseUIPhoneAuth() {
    compatApp.initializeApp(firebaseConfig);
    const firebaseAuth = compatApp.auth();

    const [firebaseui, setFirebaseui] = useState<typeof import("firebaseui") | null>(null);
    const [userSignedIn, setUserSignedIn] = useState(false);
    const elementRef = useRef(null);
    const recaptchaContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Firebase UI only works on the Client. So we're loading the package only after
        // the component has mounted, so that this works when doing server-side rendering.
        setFirebaseui(require("firebaseui"));
    }, []);

    useEffect(() => {
        if (firebaseui == null) {
            return;
        }

        // Get or Create a firebaseUI instance.
        const firebaseUiWidget = firebaseui.auth.AuthUI.getInstance() || new firebaseui.auth.AuthUI(firebaseAuth);
        if (uiConfig.signInFlow === "popup") {
            firebaseUiWidget.reset();
        }

        // We track the auth state to reset firebaseUi if the user signs out.
        const unregisterAuthObserver = onAuthStateChanged(firebaseAuth, (user) => {
            if (user == null && userSignedIn) {
                firebaseUiWidget.reset();
                setUserSignedIn(!!user);
            }
        });

        // Render the firebaseUi Widget.
        // @ts-ignore
        firebaseUiWidget.start(elementRef.current, uiConfig);

        return () => {
            unregisterAuthObserver();
            firebaseUiWidget.reset();
        };
    }, [firebaseui, uiConfig]);

    return (
        <div>
            {/* reCAPTCHA container - will be populated by Firebase */}
            <div
                ref={recaptchaContainerRef}
                id="recaptcha-container"
                style={{
                    marginBottom: "16px",
                    display: "none",
                }}
            />
            {/* FirebaseUI container */}
            <div ref={elementRef} />
        </div>
    );
}
