import { PrivyInterface } from "@privy-io/react-auth";

export const signInWithPrivy = async (privy: PrivyInterface): Promise<string | null> => {
    privy.login();
    return privy.getAccessToken();
};

export const checkPrivyAuth = (privy: PrivyInterface): Promise<string | null> => {
    return privy.getAccessToken();
};
