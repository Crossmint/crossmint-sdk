import { PrivyInterface } from "@privy-io/react-auth";

import { AuthAdapter } from ".";

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

export const signInWithPrivy = async (privy: PrivyInterface): Promise<string> => {
    privy.login();
    return privy.getAccessToken().then((jwt) => {
        if (jwt == null) {
            throw new Error("Unable to login with Privy");
        }

        return jwt;
    });
};

export const checkPrivyAuth = (privy: PrivyInterface): Promise<string | undefined> => {
    return privy.getAccessToken().then((jwt) => jwt ?? undefined);
};

export class PrivyAuthAdapter implements AuthAdapter {
    constructor(private readonly privy: PrivyInterface) {}

    login() {
        return signInWithPrivy(this.privy);
    }

    check() {
        return checkPrivyAuth(this.privy);
    }
}
