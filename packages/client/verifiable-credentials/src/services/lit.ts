import { AuthSig } from "@lit-protocol/types";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { crossmintAPI } from "../crossmintAPI";
import { LitNetwork, Lit as LitRaw } from "../verifiableCredentialsSKD";
import { DelegationSignature } from "./delegationSignature";

const fallbackCapacityDelegationAuthSig = {
    sig: "d44b33ebaafa807f6117c3581978fbf54c4a2cc958dcdfab15cfd21481af6e2a34c2d2890ef35777ff065b23f2863085a257f108c4ecb79f516345ff22dcfaf41c",
    derivedVia: "web3.eth.personal.sign",
    signedMessage:
        "example.com wants you to sign in with your Ethereum account:\n0x203F7dD921837f6Cdfc906cc17406e5bA0a87453\n\n I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://*'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0xaa2283e4f1e68ecd63293b548d921d4a318615af09d489557c922d89c47679d8\nIssued At: 2024-06-07T00:24:28.745Z\nExpiration Time: 2024-07-07T00:24:25.744Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vKiI6eyJBdXRoL0F1dGgiOlt7InVzZXMiOiIxMDAwMDAwMDAwIn1dfX0sInByZiI6W119",
    address: "203f7dd921837f6cdfc906cc17406e5ba0a87453",
    algo: undefined,
};

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
