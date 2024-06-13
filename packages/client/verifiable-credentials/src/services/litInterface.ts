import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { randomBytes } from "crypto";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { getUsageOrigin } from "./crossmintAPI";

const chain = "polygon";

export class Lit {
    private litNodeClient: any;
    public authSig: any;
    private network;

    constructor(network: string = "cayenne", env: string = "test") {
        // manzano not reliable yet
        const productionValues = ["prod", "production"];
        if (productionValues.includes(env)) {
            throw new Error("Production environment not supported yet");
        }

        const usageOrigin = getUsageOrigin();
        if (usageOrigin == null) {
            console.warn(
                "Unknown environment, make sure the sdk is running client side, The Crossmint Lit wrapper is meant to be used in the browser, refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        } else if (usageOrigin === APIKeyUsageOrigin.SERVER) {
            console.warn(
                "The Crossmint Lit wrapper is a client side tool meant to be used in the browser, not in a server environment, refer to the @lit-protocol/lit-node-client-nodejs package for server usage."
            );
        }
        this.network = network;
    }

    async connect() {
        const client = new LitJsSdk.LitNodeClient({
            alertWhenUnauthorized: false,
            litNetwork: this.network,
        });
        console.log(`Connecting to Lit ${this.network}`);
        await client.connect();
        this.litNodeClient = client;
    }

    async decrypt(base64Ciphertext: string) {
        if (!this.litNodeClient) {
            await this.connect();
        }

        if (!this.authSig) {
            const nonce = randomBytes(32).toString("hex");
            const expirationDelta = 1000 * 60 * 10; // 10 minutes
            const expiration = new Date(new Date().getTime() + expirationDelta).toISOString();
            this.authSig = await LitJsSdk.checkAndSignAuthMessage({ chain, nonce, expiration });
        }

        const ciphertext = LitJsSdk.base64StringToBlob(base64Ciphertext);
        const decryptedData = await LitJsSdk.decryptZipFileWithMetadata({
            authSig: this.authSig,
            file: ciphertext as any,
            litNodeClient: this.litNodeClient,
        });

        if (!decryptedData?.decryptedFile) {
            throw new Error("Failed to decrypt file");
        }

        const decryptedObj = LitJsSdk.uint8arrayToString(decryptedData?.decryptedFile);
        return decryptedObj;
    }
}
