import {
    CrossmintAuth,
    type CrossmintAuthOptions,
    CrossmintAuthenticationError,
    type AuthMaterialBasic,
    type AuthSession,
    type AuthMaterial,
    CROSSMINT_API_VERSION,
    type CookieOptions,
} from "@crossmint/common-sdk-auth";
import type { Crossmint, CrossmintApiClient } from "@crossmint/common-sdk-base";
import {
    FetchRequestAdapter,
    FetchResponseAdapter,
    isNodeRequest,
    isNodeResponse,
    NodeRequestAdapter,
    NodeResponseAdapter,
    type GenericRequest,
    type GenericResponse,
} from "./types/request";
import { getAuthCookies, setAuthCookies } from "./utils/cookies";
import { verifyCrossmintJwt } from "./utils/jwt";
import type { JSONWebKeySet } from "jose";

export type CrossmintAuthServerOptions = CrossmintAuthOptions & {
    cookieOptions?: CookieOptions;
};

export class CrossmintAuthServer extends CrossmintAuth {
    private cookieOptions: CookieOptions;

    private constructor(crossmint: Crossmint, apiClient: CrossmintApiClient, options: CrossmintAuthServerOptions) {
        super(crossmint, apiClient, options);
        this.cookieOptions = options.cookieOptions ?? {};
    }

    public static from(crossmint: Crossmint, options: CrossmintAuthServerOptions = {}): CrossmintAuthServer {
        return new CrossmintAuthServer(crossmint, CrossmintAuth.defaultApiClient(crossmint), options);
    }

    public async getSession(
        options: GenericRequest | AuthMaterialBasic,
        response?: GenericResponse
    ): Promise<AuthSession> {
        const request = "refreshToken" in options ? undefined : options;
        const authMaterial = request ? getAuthCookies(request) : (options as AuthMaterialBasic);
        if (authMaterial == null) {
            throw new CrossmintAuthenticationError("No auth material found");
        }
        const { jwt, refreshToken } = authMaterial;

        if (!refreshToken) {
            throw new CrossmintAuthenticationError("Refresh token not found");
        }

        try {
            return await this.validateOrRefreshSession(jwt, refreshToken, response);
        } catch (error) {
            if (error instanceof CrossmintAuthenticationError && response != null) {
                this.logout(request, response);
            }
            console.error("Failed to get session", error);
            throw new CrossmintAuthenticationError("Failed to get session");
        }
    }

    public async getUser(externalUserId: string) {
        const result = await this.apiClient.get(`api/${CROSSMINT_API_VERSION}/sdk/auth/user/${externalUserId}`, {
            headers: {
                "Content-Type": "application/json",
            },
        });

        const user = await result.json();
        return user;
    }

    public async handleCustomRefresh(request: GenericRequest, response?: GenericResponse): Promise<GenericResponse> {
        const requestAdapter = isNodeRequest(request)
            ? new NodeRequestAdapter(request)
            : new FetchRequestAdapter(request);
        const responseAdapter = isNodeResponse(response)
            ? new NodeResponseAdapter(response)
            : new FetchResponseAdapter(response);

        // If the request from the client includes a refresh token (like the OneTimeSecret after authenticating), use that
        // Otherwise, try to get the refresh token from the cookies
        const body = await requestAdapter.getBody();
        const { refresh: tokenFromBody } = body ?? {};
        const authCookies = getAuthCookies(request, { throwError: false });
        const tokenFromCookies = authCookies?.refreshToken;
        const refreshToken = tokenFromBody ?? tokenFromCookies;

        try {
            if (refreshToken == null) {
                throw new CrossmintAuthenticationError(
                    "Please provide a refresh token either in the request body or cookies"
                );
            }

            const refreshedAuthMaterial = await this.refresh(refreshToken);

            const responseWithBody = responseAdapter.setAuthMaterial(refreshedAuthMaterial);

            if (responseWithBody == null) {
                throw new CrossmintAuthenticationError("Response not found");
            }

            this.storeAuthMaterial(responseWithBody, refreshedAuthMaterial);

            return responseWithBody;
        } catch (error) {
            const errorResponseBody = { error: "Unauthorized", message: (error as Error).message };
            const errorResponse = isNodeResponse(response)
                ? response
                : responseAdapter.setError(401, errorResponseBody);

            this.logout(request, errorResponse);

            // We need to set the rest of the Node response AFTER setting headers like we do in logout
            if (isNodeResponse(errorResponse)) {
                return responseAdapter.setError(401, errorResponseBody);
            }

            return errorResponse;
        }
    }

    public verifyCrossmintJwt(token: string, jwks?: JSONWebKeySet) {
        if (jwks != null) {
            return verifyCrossmintJwt(token, jwks);
        }
        return verifyCrossmintJwt(token, this.getJwksUri());
    }

    public storeAuthMaterial(response: GenericResponse, authMaterial: AuthMaterial) {
        setAuthCookies(response, authMaterial, this.cookieOptions);
    }

    public async logout(request?: GenericRequest, response?: GenericResponse) {
        try {
            // It's not necessary to call the logout endpoint, but desirable
            if (request != null) {
                const authCookies = getAuthCookies(request);
                if (authCookies != null) {
                    await this.logoutFromDefaultRoute(authCookies.refreshToken);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            // If we're working with Node API, the response param is needed
            const responseToUse = response ?? new Response();
            this.storeAuthMaterial(responseToUse, {
                jwt: "",
                refreshToken: {
                    secret: "",
                    expiresAt: "",
                },
            });
            return responseToUse;
        }
    }

    private async validateOrRefreshSession(
        jwt: string | undefined,
        refreshToken: string,
        response?: GenericResponse
    ): Promise<AuthSession> {
        if (jwt) {
            try {
                const decodedJwt = await this.verifyCrossmintJwt(jwt);
                return {
                    jwt,
                    refreshToken: {
                        secret: refreshToken,
                        expiresAt: "",
                    },
                    userId: decodedJwt.sub as string,
                };
            } catch (_) {
                // The JWT is invalid, we need to refresh the session
            }
        }

        const refreshedAuthMaterial = await this.refreshAuthMaterial(refreshToken);

        if (response != null) {
            this.storeAuthMaterial(response, refreshedAuthMaterial);
        }

        return {
            jwt: refreshedAuthMaterial.jwt,
            refreshToken: refreshedAuthMaterial.refreshToken,
            userId: refreshedAuthMaterial.user.id,
        };
    }
}
