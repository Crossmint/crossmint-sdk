import type { AuthSig } from "@lit-protocol/types";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { crossmintAPI } from "../crossmintAPI";
import { DelegationSignature } from "../services/delegationSignature";
import {
    type EncryptedVerifiableCredential,
    type LitNetwork,
    Lit as LitRaw,
    type VerifiableCredential,
} from "../verifiableCredentialsSDK";

/**
 * Lit class for decrypting verifiable credentials that have been encrypted with the
 * VerifiableCredentialEncryptionType.DECENTRALIZED_LIT encryption type.
 */
export class Lit extends LitRaw {
    /**
     * Creates an instance of the Lit class for decrypting verifiable credentials.
     *
     * @param {LitNetwork} network - The network on which the credentials are encrypted (use CredentialMetadata.encryption.details.network).
     * @param {AuthSig} [capacityDelegationAuthSig] - The capacity delegation signature used to pay for decrypting the credentials.
     * If not provided, the Crossmint signature will be used. To use the Crossmint delegation signature, the user must have provided an API key with the `credentials.decrypt` scope.
     * @param {boolean} [debug=false] - If true, enables debug mode for additional logging.
     */
    constructor(network: LitNetwork, capacityDelegationAuthSig?: AuthSig, debug = false) {
        const usageOrigin = crossmintAPI.getOrigin();
        if (usageOrigin == null) {
            console.warn(
                "Unknown environment, make sure the SDK is running client side. The Crossmint Lit wrapper is meant to be used in the browser. Refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        } else if (usageOrigin === APIKeyUsageOrigin.SERVER) {
            console.warn(
                "The Crossmint Lit wrapper is a client-side tool meant to be used in the browser, not in a server environment. Refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        }

        super(network, capacityDelegationAuthSig, debug);
    }

    /**
     * Decrypts a verifiable credential that has been encrypted with the Lit protocol.
     * The user will be prompted to sign a message to decrypt the credential.
     *
     * @param {EncryptedVerifiableCredential} credential - The encrypted verifiable credential to decrypt.
     * @returns {Promise<VerifiableCredential>} A promise that resolves to the decrypted verifiable credential.
     */
    async decrypt(credential: EncryptedVerifiableCredential): Promise<VerifiableCredential> {
        if (this.capacityDelegationAuthSig == null) {
            console.debug("No capacity delegation auth sig provided, retrieving from Crossmint.");
            this.capacityDelegationAuthSig = await new DelegationSignature().getSignature();
        }
        return super.decrypt(credential);
    }
}
