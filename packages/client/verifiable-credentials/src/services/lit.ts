import { AuthSig } from "@lit-protocol/types";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { crossmintAPI } from "../crossmintAPI";
import { LitNetwork, Lit as LitRaw } from "../verifiableCredentialsSDK";
import { DelegationSignature } from "./delegationSignature";

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

    async decrypt(base64Ciphertext: string): Promise<string> {
        if (this.capacityDelegationAuthSig == null) {
            console.debug("No capacity delegation auth sig provided, retrieving from Crossmint");
            this.capacityDelegationAuthSig = await new DelegationSignature().getSignature();
        }
        return super.decrypt(base64Ciphertext);
    }
}
