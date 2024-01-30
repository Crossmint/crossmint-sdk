import { RELAY_API_KEY } from "@/utils/constants";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
import { ProviderType } from "@lit-protocol/constants";
import { LitAuthClient, WebAuthnProvider } from "@lit-protocol/lit-auth-client";
import { LitNodeClient, decryptToString, encryptString } from "@lit-protocol/lit-node-client";
import { PKPEthersWallet } from "@lit-protocol/pkp-ethers";
import { SiweMessage } from "siwe";

const chain = "polygon";

export class LitService {
    private litNodeClient: LitNodeClient | undefined;
    private litAuthClient: LitAuthClient | undefined;

    async connect() {
        this.litAuthClient = new LitAuthClient({
            litRelayConfig: {
                relayApiKey: RELAY_API_KEY,
            },
        });
        this.litAuthClient.initProvider<WebAuthnProvider>(ProviderType.WebAuthn);
        this.litNodeClient = new LitNodeClient({
            litNetwork: "cayenne",
        });
        await this.litNodeClient.connect();
    }

    async registerWithWebAuthn(username: string) {
        if (this.litAuthClient == null) {
            await this.connect();
        }
        const provider = this.litAuthClient!.getProvider(ProviderType.WebAuthn) as WebAuthnProvider;
        // Register new WebAuthn credential
        const options = await provider!.register(username);
        // Verify registration and mint PKP through relay server
        const txHash = await provider!.verifyAndMintPKPThroughRelayer(options);
        const response = await provider.relay.pollRequestUntilTerminalState(txHash);

        if (response.status !== "Succeeded") {
            throw new Error("Failed to register with WebAuthn");
        }

        return {
            pkpEthAddress: response.pkpEthAddress,
            pkpPublicKey: response.pkpPublicKey,
        };
    }
    async encrypt(message: string, pkpPublicKey: string, pkpEthAddress: string) {
        const { authSig, accessControlConditions } = await this.prepareLit(pkpPublicKey, pkpEthAddress);
        const { ciphertext, dataToEncryptHash } = await encryptString(
            {
                accessControlConditions,
                authSig,
                chain: chain,
                dataToEncrypt: message,
            },
            this.litNodeClient!
        );

        return {
            ciphertext,
            dataToEncryptHash,
        };
    }

    async decrypt(pkpPublicKey: string, pkpEthAddress: string, cipherText: string, dataToEncryptHash: string) {
        const { authSig, accessControlConditions } = await this.prepareLit(pkpPublicKey, pkpEthAddress);
        const decryptedString = await decryptToString(
            {
                accessControlConditions,
                ciphertext: cipherText,
                dataToEncryptHash: dataToEncryptHash,
                authSig,
                chain: chain,
            },
            this.litNodeClient!
        );
        return decryptedString;
    }

    private async prepareLit(pkpPublicKey: string, pkpEthAddress: string) {
        if (this.litAuthClient == null) {
            await this.connect();
        }

        const provider = this.litAuthClient!.getProvider(ProviderType.WebAuthn) as WebAuthnProvider;
        const authMethod = await provider.authenticate();

        const sessionSigs = await provider.getSessionSigs({
            authMethod: authMethod,
            pkpPublicKey: pkpPublicKey,
            sessionSigsParams: {
                chain: chain,
                resourceAbilityRequests: [
                    {
                        resource: new LitActionResource("*"),
                        ability: LitAbility.AccessControlConditionDecryption,
                    },
                ],
            },
        });

        const pkpWallet = new PKPEthersWallet({
            controllerSessionSigs: sessionSigs,
            pkpPubKey: pkpPublicKey,
            rpc: "https://chain-rpc.litprotocol.com/http",
            debug: true,
        });
        await pkpWallet.init();

        const statement = "SIWE";
        const siweMessage = new SiweMessage({
            domain: window.location.hostname,
            address: pkpWallet.address,
            statement,
            uri: origin,
            version: "1",
            chainId: 1,
            nonce: this.litNodeClient!.getLatestBlockhash()!,
            expirationTime: new Date(Date.now() + 60_000 * 60).toISOString(), // Valid for 1 hour
        });
        const messageToSign = siweMessage.prepareMessage();
        const signature = await pkpWallet.signMessage(messageToSign);

        const authSig = {
            sig: signature,
            derivedVia: "web3.eth.personal.sign",
            signedMessage: messageToSign,
            address: pkpWallet.address,
        };

        const accessControlConditions = [
            {
                contractAddress: "",
                standardContractType: "",
                chain,
                method: "",
                parameters: [":userAddress"],
                returnValueTest: {
                    comparator: "=",
                    value: pkpEthAddress,
                },
            },
        ];

        return { authSig, accessControlConditions };
    }
}
