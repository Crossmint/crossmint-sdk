import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { randomBytes } from "crypto";

const chain = "polygon";

export class Lit {
    private litNodeClient: any;
    public authSig: any;
    private network;

    constructor(network: string = "cayenne") {
        // manzano not reliable yet
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
