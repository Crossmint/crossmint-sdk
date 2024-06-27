import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { crossmintAPI } from "../crossmintAPI";
import { Lit as LitRaw } from "../verifiableCredentialsSKD";

export class Lit extends LitRaw {
    constructor(network: string = "cayenne", env: string = "test") {
        // manzano not reliable yet
        const productionValues = ["prod", "production"];
        if (productionValues.includes(env)) {
            throw new Error("Production environment not supported yet");
        }

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
        super(network);
    }
}
