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
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
