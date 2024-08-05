import { env } from "@/env";
import { FirebaseError, getApp, getApps, initializeApp } from "firebase/app";
import {
    GoogleAuthProvider,
    UserCredential,
    getAuth,
    indexedDBLocalPersistence,
    onAuthStateChanged,
    signInWithPopup,
    signOut,
} from "firebase/auth";

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY || "default_api_key",
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "default_auth_domain",
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "default_project_id",
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "default_storage",
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "default_sender_id",
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID || "default_app_id",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const getAuthedJWT = (): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            try {
                if (user) {
                    const jwt = await user.getIdToken(true);
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

const signInWithGoogle = async (): Promise<string | undefined> => {
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
export { auth, onAuthStateChanged, signInWithGoogle, getAuthedJWT, signInWithPopup, signOut };
