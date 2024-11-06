import type { UseSignInData } from "@farcaster/auth-kit";
import {
    type AuthMaterialWithUser,
    CROSSMINT_API_VERSION,
    CrossmintAuth,
    type OAuthProvider,
    REFRESH_TOKEN_PREFIX,
    SESSION_PREFIX,
} from "@crossmint/common-sdk-auth";
import type { Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { type CancellableTask, queueTask } from "@crossmint/client-sdk-base";
import {
    AUTH_SDK_ROOT_ENDPOINT,
    deleteCookie,
    getCookie,
    getJWTExpiration,
    setCookie,
    TIME_BEFORE_EXPIRING_JWT_IN_SECONDS,
} from "./utils";

export class CrossmintAuthClient extends CrossmintAuth {
    private callbacks: CrossmintAuthClientCallbacks;
    private refreshTask: CancellableTask | null = null;
    private isRefreshing = false;

    private constructor(
        crossmint: Crossmint,
        apiClient: CrossmintApiClient,
        callbacks: CrossmintAuthClientCallbacks = {}
    ) {
        super(crossmint, apiClient);
        this.callbacks = callbacks;
    }

    public static from(crossmint: Crossmint, callbacks?: CrossmintAuthClientCallbacks): CrossmintAuthClient {
        const authClient = new CrossmintAuthClient(crossmint, CrossmintAuth.defaultApiClient(crossmint), callbacks);
        // Fire-off refresh tokens task on init
        authClient.handleRefreshToken();
        return authClient;
    }

    public async getUser() {
        const result = await this.apiClient.get(`api/${CROSSMINT_API_VERSION}/sdk/auth/user`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const user = await result.json();
        return user;
    }

    public storeAuthMaterial(authMaterial: AuthMaterialWithUser) {
        setCookie(SESSION_PREFIX, authMaterial.jwt);
        setCookie(REFRESH_TOKEN_PREFIX, authMaterial.refreshToken.secret, authMaterial.refreshToken.expiresAt);
    }

    public async logout() {
        // Even if there's a server error, we want to clear the cookies
        try {
            await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/logout`, {
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    refresh: getCookie(REFRESH_TOKEN_PREFIX),
                }),
            });
        } catch (error) {
            console.error(error);
        } finally {
            deleteCookie(REFRESH_TOKEN_PREFIX);
            deleteCookie(SESSION_PREFIX);
            this.callbacks.onLogout?.();
        }
    }

    public async handleRefreshToken(refreshTokenSecret?: string): Promise<void> {
        const refreshToken = refreshTokenSecret ?? getCookie(REFRESH_TOKEN_PREFIX);
        if (refreshToken == null || this.isRefreshing) {
            return;
        }

        try {
            this.isRefreshing = true;
            const authMaterial = await this.refreshAuthMaterial(refreshToken);
            this.storeAuthMaterial(authMaterial);
            this.callbacks.onTokenRefresh?.(authMaterial);

            this.scheduleNextRefresh(authMaterial.jwt);
        } catch (error) {
            console.error(error);
            this.logout();
        } finally {
            this.isRefreshing = false;
        }
    }

    public async getOAuthUrl(provider: OAuthProvider) {
        const result = await this.apiClient.get(`${AUTH_SDK_ROOT_ENDPOINT}/social/${provider}/start`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const data = (await result.json()) as { oauthUrl: string };
        return data.oauthUrl;
    }

    public async sendEmailOtp(email: string) {
        const result = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/otps/send`, {
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        return await result.json();
    }

    public async confirmEmailOtp(email: string, emailId: string, token: string) {
        const queryParams = new URLSearchParams({
            email,
            signinAuthenticationMethod: "email",
            token,
            locale: "en",
            state: emailId,
            callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/we-dont-actually-use-this-anymore`,
        });
        const result = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/authenticate?${queryParams}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const resData = await result.json();
        const callbackUrl = new URL(resData.callbackUrl);

        // parse the oneTimeSecret from the callbackUrl response
        return callbackUrl.searchParams.get("oneTimeSecret");
    }

    public async signInWithFarcaster(data: UseSignInData) {
        const queryParams = new URLSearchParams({
            signinAuthenticationMethod: "farcaster",
            callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback?isPopup=false`,
        });

        const result = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/authenticate?${queryParams}`, {
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                ...data,
                domain: data.signatureParams.domain,
                redirect: true,
                callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback?isPopup=false`,
            }),
        });

        const resData = await result.json();
        const callbackUrl = new URL(resData.callbackUrl);

        // parse the oneTimeSecret from the callbackUrl response
        return callbackUrl.searchParams.get("oneTimeSecret");
    }

    private scheduleNextRefresh(jwt: string): void {
        const jwtExpiration = getJWTExpiration(jwt);
        if (!jwtExpiration) {
            throw new Error("Invalid JWT");
        }

        const currentTime = Date.now() / 1000;
        const timeToExpire = jwtExpiration - currentTime - TIME_BEFORE_EXPIRING_JWT_IN_SECONDS;

        if (timeToExpire > 0) {
            const endTime = Date.now() + timeToExpire * 1000;
            this.cancelScheduledRefresh();
            this.refreshTask = queueTask(() => this.handleRefreshToken(), endTime);
        }
    }

    private cancelScheduledRefresh(): void {
        if (this.refreshTask) {
            this.refreshTask.cancel();
            this.refreshTask = null;
        }
    }
}

type CrossmintAuthClientCallbacks = {
    onTokenRefresh?: (authMaterial: AuthMaterialWithUser) => void;
    onLogout?: () => void;
};
