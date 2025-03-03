import type { UseSignInData } from "@farcaster/auth-kit";
import {
    AUTH_SDK_ROOT_ENDPOINT,
    type AuthMaterialWithUser,
    CROSSMINT_API_VERSION,
    CrossmintAuth,
    CrossmintAuthenticationError,
    type CrossmintAuthOptions,
    type OAuthProvider,
    REFRESH_TOKEN_PREFIX,
    SESSION_PREFIX,
} from "@crossmint/common-sdk-auth";
import type { Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import { type CancellableTask, queueTask } from "@crossmint/client-sdk-base";
import { deleteCookie, getCookie, getJWTExpiration, setCookie, TIME_BEFORE_EXPIRING_JWT_IN_SECONDS } from "./utils";

export type CrossmintAuthClientConfig = CrossmintAuthOptions & {
    callbacks?: CrossmintAuthClientCallbacks;
    logoutRoute?: string;
};

export class CrossmintAuthClient extends CrossmintAuth {
    private callbacks: CrossmintAuthClientCallbacks;
    private refreshTask: CancellableTask | null = null;
    private refreshPromise: Promise<AuthMaterialWithUser> | null = null;
    private logoutRoute: string | null;

    protected constructor(crossmint: Crossmint, apiClient: CrossmintApiClient, config: CrossmintAuthClientConfig = {}) {
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
        try {
            const response = await this.apiClient.get(`api/${CROSSMINT_API_VERSION}/sdk/auth/user`, {
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            return await response.json();
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to fetch user: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public storeAuthMaterial(authMaterial: AuthMaterialWithUser) {
        setCookie(SESSION_PREFIX, authMaterial.jwt);
        setCookie(REFRESH_TOKEN_PREFIX, authMaterial.refreshToken.secret, authMaterial.refreshToken.expiresAt);
    }

    public async logout() {
        // Store the old refresh token to pass it to the logout route before deleting the cookies
        const oldRefreshToken = getCookie(REFRESH_TOKEN_PREFIX);

        // Even if there's a server error, we want to clear the cookies and we do it first to load faster
        deleteCookie(REFRESH_TOKEN_PREFIX);
        deleteCookie(SESSION_PREFIX);
        this.callbacks.onLogout?.();
        try {
            if (this.logoutRoute != null) {
                await this.logoutFromCustomRoute();
            } else if (oldRefreshToken != null) {
                await this.logoutFromDefaultRoute(oldRefreshToken);
            }
        } catch (error) {
            console.error(error);
        }
    }

    public async handleRefreshAuthMaterial(refreshTokenSecret?: string): Promise<void> {
        const refreshToken = refreshTokenSecret ?? getCookie(REFRESH_TOKEN_PREFIX);
        // If there is a custom refresh route, that endpoint will fetch the cookies itself
        if (refreshToken == null && this.refreshRoute == null) {
            return;
        }

        try {
            // Create new refresh promise if none exists
            if (this.refreshPromise == null) {
                this.refreshPromise = this.refreshAuthMaterial(refreshToken);
            }
            const authMaterial = await this.refreshPromise;

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
            this.refreshPromise = null;
        }
    }

    public async getOAuthUrl(provider: OAuthProvider) {
        try {
            const response = await this.apiClient.get(`${AUTH_SDK_ROOT_ENDPOINT}/social/${provider}/start`, {
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            const data = await response.json();
            return data.oauthUrl;
        } catch (error) {
            console.error(
                `Failed to get OAuth URL for provider ${provider}: ${error instanceof Error ? error.message : "Unknown error"}`
            );

            // Extract origin from error message if it matches the pattern
            if (error instanceof Error && error.message.includes("Request from origin")) {
                const originMatch = error.message.match(/origin "([^"]+)"/);
                const origin = originMatch?.[1];
                if (origin) {
                    throw new CrossmintAuthenticationError(
                        `Unauthorized origin: ${origin}. Please add this origin to your API key's authorized origins in the Crossmint Console.`
                    );
                }
            }
            throw new CrossmintAuthenticationError("Unable to load oauth providers. Please try again later.");
        }
    }

    public async sendEmailOtp(email: string) {
        try {
            const response = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/otps/send`, {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            return await response.json();
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to send email OTP: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public async confirmEmailOtp(email: string, emailId: string, token: string) {
        try {
            const queryParams = new URLSearchParams({
                email,
                signinAuthenticationMethod: "email",
                token,
                locale: "en",
                state: emailId,
                // TODO: Remove this when we deprecate frames
                callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback`,
            });

            const response = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/authenticate?${queryParams}`, {
                headers: { "Content-Type": "application/json" },
            });

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            const resData = await response.json();
            return resData.oneTimeSecret;
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to confirm email OTP: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public async signInWithFarcaster(data: UseSignInData) {
        try {
            const queryParams = new URLSearchParams({
                signinAuthenticationMethod: "farcaster",
                callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback`,
            });

            const response = await this.apiClient.post(`${AUTH_SDK_ROOT_ENDPOINT}/authenticate?${queryParams}`, {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    domain: data.signatureParams.domain,
                    redirect: true,
                    callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback`,
                }),
            });

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            const resData = await response.json();
            return resData.oneTimeSecret;
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to sign in with Farcaster: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public async signInWithSmartWallet(address: string) {
        try {
            const queryParams = new URLSearchParams({ signinAuthenticationMethod: "evm" });
            const response = await this.apiClient.post(
                `${AUTH_SDK_ROOT_ENDPOINT}/crypto_wallets/authenticate/start?${queryParams}`,
                {
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ walletAddress: address }),
                }
            );

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            return await response.json();
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to initiate smart wallet sign in: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    public async authenticateSmartWallet(address: string, signature: string) {
        try {
            const queryParams = new URLSearchParams({
                signinAuthenticationMethod: "evm",
                // TODO: Remove this when we deprecate frames
                callbackUrl: `${this.apiClient.baseUrl}/${AUTH_SDK_ROOT_ENDPOINT}/callback`,
            });
            const response = await this.apiClient.post(
                `${AUTH_SDK_ROOT_ENDPOINT}/crypto_wallets/authenticate?${queryParams}`,
                {
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ walletAddress: address, signature }),
                }
            );

            if (!response.ok) {
                throw new Error(JSON.parse(await response.text())?.message);
            }

            return await response.json();
        } catch (error) {
            throw new CrossmintAuthenticationError(
                `Failed to authenticate smart wallet: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
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
