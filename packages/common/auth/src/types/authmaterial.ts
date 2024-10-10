import type { SDKExternalUser } from "./user";

export type AuthMaterialBasic = {
    jwtToken?: string;
    refreshToken: string;
};

interface refreshTokenObject {
    secret: string;
    expiresAt: string;
}

export type AuthMaterial = {
    jwtToken: string;
    refreshToken: refreshTokenObject;
    user: SDKExternalUser;
};

export type AuthMaterialResponse = {
    jwt: string;
    refresh: refreshTokenObject;
    user: SDKExternalUser;
};

export type AuthSession = {
    jwtToken: string;
    userId: string;
};
