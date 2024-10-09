import type { SDKExternalUser } from "./user";

export type AuthMaterial = {
    jwtToken: string;
    refreshToken: {
        secret: string;
        expiresAt: string;
    };
    user: SDKExternalUser;
};
