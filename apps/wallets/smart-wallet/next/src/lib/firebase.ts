import { env } from "@/env";
import { createOrGetPasskeyWallet } from "@/utils/create-or-get-passkey-wallet";
import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";

const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
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

const getSmartWallet = async () => {
    const jwt = await getAuthedJWT();
    if (!jwt) {
        return;
    }
    return await createOrGetPasskeyWallet(jwt);
};

export { auth, onAuthStateChanged, getSmartWallet, getAuthedJWT, signInWithPopup, GoogleAuthProvider, signOut };
