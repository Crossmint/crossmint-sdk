import type { SDKExternalUser } from "./user";

export type AuthMaterialBasic = {
    jwt?: string;
    refreshToken: string;
};

interface RefreshToken {
    secret: string;
    expiresAt: string;
}

export type AuthMaterial = {
    jwt: string;
    refreshToken: RefreshToken;
    user: SDKExternalUser;
};

export type AuthMaterialResponse = {
    jwt: string;
    refresh: RefreshToken;
    user: SDKExternalUser;
};

export type AuthSession = {
    jwt: string;
    userId: string;
};
