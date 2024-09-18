import { LitAbility, LitAccessControlConditionResource } from "@lit-protocol/auth-helpers";
import * as LitJsSdk from "@lit-protocol/lit-node-client";
import type { AuthSig, LIT_NETWORKS_KEYS, SessionSigsMap } from "@lit-protocol/types";

import type { EncryptedVerifiableCredential } from "../types";
import { isVerifiableCredential } from "../types/utils";

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

export const LitNetwork = {
    prodNetwork: "habanero",
    testNetwork: "manzano",
    legacyNetwork: "cayenne",
} as const;

export type LitNetwork = (typeof LitNetwork)[keyof typeof LitNetwork] & LIT_NETWORKS_KEYS;

export class Lit {
    protected capacityDelegationAuthSig?: AuthSig;
    private network: LIT_NETWORKS_KEYS;
    private chain: LitChain;
    private debug = false;
    private litNodeClient?: LitJsSdk.LitNodeClient;
    private sessionSigs?: SessionSigsMap;

    constructor(network: LitNetwork, capacityDelegationAuthSig?: AuthSig, debug = false) {
        this.debug = debug;

        this.network = network;
        this.chain = this.network === LitNetwork.prodNetwork ? LitChain.prodChain : LitChain.testChain;
        this.capacityDelegationAuthSig = capacityDelegationAuthSig;
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
        if (!this.capacityDelegationAuthSig) {
            console.warn(
                "No capacity delegation auth sig provided, the user will pay for the operation, the users wallet is required to have Lit capacity tokens."
            );
        }

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
        // console.debug("Obtained sessionSigs:", sessionSigs);
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
        const decryptedObj = JSON.parse(LitJsSdk.uint8arrayToString(decryptedData?.decryptedFile));
        return decryptedObj;
    }

    async decrypt(credential: EncryptedVerifiableCredential) {
        const base64Ciphertext = credential.payload;
        try {
            const vc = await this.tryDecrypt(base64Ciphertext);
            if (!isVerifiableCredential(vc)) {
                throw new Error("Decrypted data is not a valid Verifiable Credential");
            }
            return vc;
        } catch (error: any) {
            console.error("Decryption error", error.message, error);
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
