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
    refreshToken: {
        token: string;
        expiresAt: string;
    };
    user: SDKExternalUser;
};

export type AuthSession = {
    jwt: string;
    refreshToken: RefreshToken;
    userId: string;
};

interface RefreshToken {
    secret: string;
    expiresAt: string;
}

export type OAuthProvider = "google";
