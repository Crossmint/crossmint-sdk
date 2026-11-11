import type { SDKExternalUser } from "./user";

export type AuthMaterialBasic = {
    jwt?: string;
    refreshToken: string;
};

export type AuthMaterial = {
    jwt: string;
    refreshToken: RefreshToken;
};

export type AuthMaterialWithUser = AuthMaterial & {
    user: SDKExternalUser;
};

export type AuthMaterialResponse = {
    jwt: string;
    refresh: RefreshToken;
    user: SDKExternalUser;
};

export type AuthSession = {
    jwt: string;
    refreshToken: RefreshToken;
    userId: string;
    /**
     * The user (email, phone number and other linked accounts), when getting the session refreshed it: the
     * refresh response carries it. Undefined when the JWT was still valid; fetch the user then.
     */
    user?: SDKExternalUser;
};

interface RefreshToken {
    secret: string;
    expiresAt: string;
}

export type OAuthProvider = "google" | "twitter";
