import { Auth0Provider } from "@auth0/auth0-react";
import { ReactNode } from "react";

export default ({ children }: { children: ReactNode }) => {
    return (
        <Auth0Provider
            domain="dev-kxzagucpp8zdb87p.us.auth0.com"
            clientId="P7SII252F2qKo81USpInSKNbrmx7mMuG"
            authorizationParams={{
                redirect_uri: window.location.origin,
            }}
        >
            {children}
        </Auth0Provider>
    );
};
