import { AuthSig } from "@lit-protocol/types";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { crossmintAPI } from "../crossmintAPI";
import { DelegationSignature } from "../services/delegationSignature";
import {
    EncryptedVerifiableCredential,
    LitNetwork,
    Lit as LitRaw,
    VerifiableCredential,
} from "../verifiableCredentialsSDK";

/**
 * Lit class for decrypting verifiable credentials that have been encrypted with the VerifiableCredentialEncryptionType.LIT encryption type.
 * @param network - The network on which the credentials are encrypted (use CredentialMetadata.encryption.details.network)
 * @param capacityDelegationAuthSig - The capacity delegation signature used to pay for decrypting the credentials, if not provided the crossmint one will be used.
 * To use the crossmint delegation signature the user must have provided an api key with the `credentials.decrypt` scope.
 */
export class Lit extends LitRaw {
    constructor(network: LitNetwork, capacityDelegationAuthSig?: AuthSig, debug = false) {
        const usageOrigin = crossmintAPI.getOrigin();
        if (usageOrigin == null) {
            console.warn(
                "Unknown environment, make sure the sdk is running client side, The Crossmint Lit wrapper is meant to be used in the browser, refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        } else if (usageOrigin === APIKeyUsageOrigin.SERVER) {
            console.warn(
                "The Crossmint Lit wrapper is a client side tool meant to be used in the browser, not in a server environment, refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        }

        super(network, capacityDelegationAuthSig, debug);
    }

    async decrypt(credential: EncryptedVerifiableCredential): Promise<VerifiableCredential> {
        if (this.capacityDelegationAuthSig == null) {
            console.debug("No capacity delegation auth sig provided, retrieving from Crossmint");
            this.capacityDelegationAuthSig = await new DelegationSignature().getSignature();
        }
        return super.decrypt(credential);
    }
}
