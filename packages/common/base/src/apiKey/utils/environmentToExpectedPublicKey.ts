import { CROSSMINT_API_KEY_SIGNER_PUBLICKEY_PROD, CROSSMINT_API_KEY_SIGNER_PUBLICKEY_STAGING } from "../consts";
import { APIKeyEnvironmentPrefix } from "../types";

export function environmentToExpectedPublicKey(environment?: APIKeyEnvironmentPrefix): string | null {
    switch (environment) {
        case "development":
        case "staging":
            return CROSSMINT_API_KEY_SIGNER_PUBLICKEY_STAGING;
        case "production":
            return CROSSMINT_API_KEY_SIGNER_PUBLICKEY_PROD;
        default:
            return null;
    }
}
