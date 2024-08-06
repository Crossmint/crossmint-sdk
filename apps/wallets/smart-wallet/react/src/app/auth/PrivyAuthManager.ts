import { PrivyInterface } from "@privy-io/react-auth";

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

export const signInWithPrivy = async (privy: PrivyInterface): Promise<string | null> => {
    privy.login();
    return privy.getAccessToken();
};

export const checkPrivyAuth = (privy: PrivyInterface): Promise<string | null> => {
    return privy.getAccessToken();
};
