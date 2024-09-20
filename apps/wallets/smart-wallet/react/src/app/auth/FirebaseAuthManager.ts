import { FirebaseError, initializeApp } from "firebase/app";
import {
    GoogleAuthProvider,
    type UserCredential,
    getAuth,
    indexedDBLocalPersistence,
    onAuthStateChanged,
    signInWithPopup,
} from "firebase/auth";

const FIREBASE_CONFIG = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

export const parseToken = (token: any) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace("-", "+").replace("_", "/");
        return JSON.parse(window.atob(base64 || ""));
    } catch (err) {
        console.error(err);
        return null;
    }
};

export const firebaseAuth = () => {
    const app = initializeApp(FIREBASE_CONFIG);
    return getAuth(app);
};

export const signInWithGoogle = async (): Promise<string | undefined> => {
    const auth = firebaseAuth();

    auth.setPersistence(indexedDBLocalPersistence);
    const googleProvider = new GoogleAuthProvider();
    let res: UserCredential;
    try {
        res = await signInWithPopup(auth, googleProvider);
    } catch (e) {
        console.log(
            e instanceof FirebaseError && e.code === "auth/popup-closed-by-user"
                ? "Pop-up closed without selecting an account"
                : e
        );
        return;
    }

    return res.user.getIdToken(true);
};

export const checkAuthState = (): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
        const auth = firebaseAuth();
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const jwt = await user.getIdToken();
                    resolve(jwt);
                } else {
                    resolve(undefined);
                }
            } catch (error) {
                reject(error);
            }
        });
    });
};
