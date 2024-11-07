import type { UseSignInData } from "@farcaster/auth-kit";
import {
    AUTH_SDK_ROOT_ENDPOINT,
    type AuthMaterialWithUser,
    CROSSMINT_API_VERSION,
    CrossmintAuth,
    type CrossmintAuthOptions,
    type OAuthProvider,
    REFRESH_TOKEN_PREFIX,
    SESSION_PREFIX,
} from "@crossmint/common-sdk-auth";
import type { Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { type CancellableTask, queueTask } from "@crossmint/client-sdk-base";
import { deleteCookie, getCookie, getJWTExpiration, setCookie, TIME_BEFORE_EXPIRING_JWT_IN_SECONDS } from "./utils";

type CrossmintAuthClientConfig = CrossmintAuthOptions & {
    callbacks?: CrossmintAuthClientCallbacks;
    logoutRoute?: string;
};

export class CrossmintAuthClient extends CrossmintAuth {
    private callbacks: CrossmintAuthClientCallbacks;
    private refreshTask: CancellableTask | null = null;
    private isRefreshing = false;
    private logoutRoute: string | null;

    private constructor(crossmint: Crossmint, apiClient: CrossmintApiClient, config: CrossmintAuthClientConfig = {}) {
        super(crossmint, apiClient, config);
        this.callbacks = config.callbacks ?? {};
        this.logoutRoute = config.logoutRoute ?? null;
    }

    public static from(crossmint: Crossmint, config: CrossmintAuthClientConfig = {}): CrossmintAuthClient {
        const authClient = new CrossmintAuthClient(crossmint, CrossmintAuth.defaultApiClient(crossmint), config);
        // In case an instance is created on the server, we can't refresh as this stores cookies
        if (typeof window !== "undefined") {
            authClient.handleRefreshAuthMaterial();
        }
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
            if (this.logoutRoute != null) {
                await this.logoutFromCustomRoute();
            } else {
                await this.logoutFromDefaultRoute(getCookie(REFRESH_TOKEN_PREFIX));
            }
        } catch (error) {
            console.error(error);
        } finally {
            deleteCookie(REFRESH_TOKEN_PREFIX);
            deleteCookie(SESSION_PREFIX);
            this.callbacks.onLogout?.();
        }
    }

    public async handleRefreshAuthMaterial(refreshTokenSecret?: string): Promise<void> {
        const refreshToken = refreshTokenSecret ?? getCookie(REFRESH_TOKEN_PREFIX);
        // If there is a custom refresh route, that endpoint will fetch the cookies itself
        if ((refreshToken == null && this.refreshRoute == null) || this.isRefreshing) {
            return;
        }

        try {
            this.isRefreshing = true;
            const authMaterial = await this.refreshAuthMaterial(refreshToken);

            // If a custom refresh route is set, storing in cookies is handled in the server
            if (this.refreshRoute == null) {
                this.storeAuthMaterial(authMaterial);
            }

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

    public async signInWithSmartWallet(address: string) {
        const queryParams = new URLSearchParams({
            signinAuthenticationMethod: "evm",
        });

        const result = await this.apiClient.post(
            `${AUTH_SDK_ROOT_ENDPOINT}/crypto_wallets/authenticate/start?${queryParams}`,
            {
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ walletAddress: address }),
            }
        );
        return await result.json();
    }

    public async authenticateSmartWallet(address: string, signature: string) {
        const queryParams = new URLSearchParams({
            signinAuthenticationMethod: "evm",
            callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/we-dont-actually-use-this-anymore`,
        });

        const result = await this.apiClient.post(
            `${AUTH_SDK_ROOT_ENDPOINT}/crypto_wallets/authenticate?${queryParams}`,
            {
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ walletAddress: address, signature }),
            }
        );
        return await result.json();
    }

    private async logoutFromCustomRoute(): Promise<Response> {
        if (!this.logoutRoute) {
            throw new Error("Custom logout route is not set");
        }

        return await fetch(this.logoutRoute, { method: "POST" });
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
            this.refreshTask = queueTask(() => this.handleRefreshAuthMaterial(), endTime);
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