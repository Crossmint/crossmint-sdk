import { Auth0ContextInterface } from "@auth0/auth0-react";

import { AuthAdapter } from ".";

export class Auth0AuthAdapter implements AuthAdapter {
    private readonly options = {
        authorizationParams: {
            audience: "https://dev-kxzagucpp8zdb87p.us.auth0.com/api/v2/",
        },
    };

    constructor(private readonly auth0: Auth0ContextInterface) {}

    async login() {
        await this.auth0.loginWithPopup(this.options);
        return this.auth0.getAccessTokenSilently(this.options);
    }

    async check() {
        return this.auth0.isAuthenticated ? await this.auth0.getAccessTokenWithPopup(this.options) : undefined;
    }

    async logout() {
        return this.auth0.logout({ openUrl: false });
    }
}
