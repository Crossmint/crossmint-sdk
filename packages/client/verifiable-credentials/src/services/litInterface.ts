import { LitAbility, LitAccessControlConditionResource } from "@lit-protocol/auth-helpers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import { AuthSig, LIT_NETWORKS_KEYS, SessionSigsMap } from "@lit-protocol/types";

import { APIKeyUsageOrigin } from "@crossmint/common-sdk-base";

import { getUsageOrigin } from "./crossmintAPI";
import { isProduction } from "./utils";

const fallbackCapacityDelegationAuthSig = {
    sig: "d44b33ebaafa807f6117c3581978fbf54c4a2cc958dcdfab15cfd21481af6e2a34c2d2890ef35777ff065b23f2863085a257f108c4ecb79f516345ff22dcfaf41c",
    derivedVia: "web3.eth.personal.sign",
    signedMessage:
        "example.com wants you to sign in with your Ethereum account:\n0x203F7dD921837f6Cdfc906cc17406e5bA0a87453\n\n I further authorize the stated URI to perform the following actions on my behalf: (1) 'Auth': 'Auth' for 'lit-ratelimitincrease://*'.\n\nURI: lit:capability:delegation\nVersion: 1\nChain ID: 1\nNonce: 0xaa2283e4f1e68ecd63293b548d921d4a318615af09d489557c922d89c47679d8\nIssued At: 2024-06-07T00:24:28.745Z\nExpiration Time: 2024-07-07T00:24:25.744Z\nResources:\n- urn:recap:eyJhdHQiOnsibGl0LXJhdGVsaW1pdGluY3JlYXNlOi8vKiI6eyJBdXRoL0F1dGgiOlt7InVzZXMiOiIxMDAwMDAwMDAwIn1dfX0sInByZiI6W119",
    address: "203f7dd921837f6cdfc906cc17406e5ba0a87453",
    algo: undefined,
};

const authNeededCallback = async (params: any) => {
    const authSig = await LitJsSdk.checkAndSignAuthMessage({
        chain: params.chain,
        nonce: params.nonce,
        expiration: params.expiration,
        resources: params.resources,
        uri: params.uri,
    });
    console.debug("AuthSig:", authSig);
    return authSig;
};

const LitChain = {
    prodChain: "polygon",
    testChain: "mumbai", // amoy is not supported yet
} as const;
type LitChain = (typeof LitChain)[keyof typeof LitChain];

const LitNetwork = {
    prodNetwork: "habanero",
    testNetwork: "manzano",
} as const;

type LitNetwork = (typeof LitNetwork)[keyof typeof LitNetwork] & LIT_NETWORKS_KEYS;

export class Lit {
    prod: boolean;
    private capacityDelegationAuthSig: AuthSig;
    private network: LIT_NETWORKS_KEYS;
    private chain: LitChain;
    private debug = false;
    private litNodeClient?: LitJsSdk.LitNodeClient;
    private sessionSigs?: SessionSigsMap;

    constructor(env: string = "test", capacityDelegationAuthSig?: AuthSig, debug = false) {
        this.debug = debug;
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

        this.prod = isProduction(env);

        this.network = this.prod ? LitNetwork.prodNetwork : LitNetwork.testNetwork;
        this.chain = this.prod ? LitChain.prodChain : LitChain.testChain;
        this.capacityDelegationAuthSig = capacityDelegationAuthSig ?? fallbackCapacityDelegationAuthSig;
    }

    async connect() {
        const client = new LitJsSdk.LitNodeClient({
            alertWhenUnauthorized: false,
            litNetwork: this.network,
            debug: this.debug,
        });
        console.log(`Connecting to Lit ${this.network}`);
        await client.connect();
        return client;
    }

    private async auth(litNodeClient: LitJsSdk.LitNodeClient) {
        const expirationDelta = 1000 * 60 * 10; // 10 minutes
        const expiration = new Date(new Date().getTime() + expirationDelta).toISOString();

        const ability = {
            resource: new LitAccessControlConditionResource("*"),
            ability: LitAbility.AccessControlConditionDecryption,
        };
        const sessionSigs = await litNodeClient.getSessionSigs({
            chain: this.chain,
            expiration,
            authNeededCallback: authNeededCallback,
            resourceAbilityRequests: [ability],
            capacityDelegationAuthSig: this.capacityDelegationAuthSig,
        });
        console.debug("obtained sessionSigs:", sessionSigs);
        return sessionSigs;
    }

    private async tryDecrypt(base64Ciphertext: string) {
        if (!this.litNodeClient) {
            this.litNodeClient = await this.connect();
        }

        if (!this.sessionSigs) {
            this.sessionSigs = await this.auth(this.litNodeClient);
        }

        const ciphertext = LitJsSdk.base64StringToBlob(base64Ciphertext);

        const decryptedData = await LitJsSdk.decryptZipFileWithMetadata({
            sessionSigs: this.sessionSigs,
            file: ciphertext as any,
            litNodeClient: this.litNodeClient,
        });

        if (!decryptedData?.decryptedFile) {
            throw new Error(
                `Failed to decrypt file. Hint: Be sure the file was encrypted on the same network, currently using ${this.network} network.`
            );
        }

        const decryptedObj = LitJsSdk.uint8arrayToString(decryptedData?.decryptedFile);
        return decryptedObj;
    }

    async decrypt(base64Ciphertext: string) {
        try {
            return await this.tryDecrypt(base64Ciphertext);
        } catch (error: any) {
            console.error("Decryption error", error);
            if (error.errorCode === "NodeAccessControlConditionsReturnedNotAuthorized") {
                throw new Error("Unauthorized to decrypt file");
            }

            if (error.errorCode === "rate_limit_exceeded") {
                throw new Error("Rate limit exceeded, be sure to have capacity on the delegation account");
            }

            if (error.message === "There was an error getting the signing shares from the nodes") {
                throw new Error(
                    "Could not get signing shares from nodes. Hint: Be sure to have the right permissions before checking for network problems."
                );
            }

            if (error.message === "User rejected the request.") {
                throw new Error("User has to approve the request to decrypt the file");
            }

            if (error.message.includes("SIWE")) {
                if (error.details?.includes("Message is not currently valid")) {
                    throw new Error("Be sure the capacity delegation sig is not expired");
                }
                throw new Error("Be sure the capacity delegation sig is valid");
            }

            throw error;
        }
    }
}
