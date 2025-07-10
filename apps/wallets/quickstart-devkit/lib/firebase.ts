import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, type User } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function initApp() {
    if (firebaseConfig.apiKey == null) {
        return;
    }
    return initializeApp(firebaseConfig);
}

function initAuth() {
    const app = initApp();
    if (app == null) {
        return;
    }
    return getAuth(app);
}

const auth = initAuth();
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
    if (auth == null) {
        return;
    }
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

export const signOutUser = async () => {
    if (auth == null) {
        return;
    }
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
    if (auth == null) {
        return;
    }
    return onAuthStateChanged(auth, callback);
};

export { auth };
