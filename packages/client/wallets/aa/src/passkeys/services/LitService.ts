import { logError, logInfo } from "@/services/logging";
import { DecryptInput, EncryptInput } from "@/types";
import { LitProtocolError, errorToJSON, isLocalhost } from "@/utils";
import { RELAY_API_KEY } from "@/utils/constants";
import { LitAbility, LitActionResource } from "@lit-protocol/auth-helpers";
import { ProviderType } from "@lit-protocol/constants";
import { LitAuthClient, WebAuthnProvider } from "@lit-protocol/lit-auth-client";
import { LitNodeClient, decryptToString, encryptString } from "@lit-protocol/lit-node-client";
import { AuthSig } from "@lit-protocol/types";

const chain = "polygon";

export class LitService {
    private litNodeClient: LitNodeClient | undefined;
    private litAuthClient: LitAuthClient | undefined;

    async connect() {
        this.litNodeClient = new LitNodeClient({
            litNetwork: isLocalhost() ? "manzano" : "habanero",
            connectTimeout: 60000,
        });
        await this.litNodeClient.connect();

        this.litAuthClient = new LitAuthClient({
            litRelayConfig: {
                relayApiKey: RELAY_API_KEY,
            },
            litNodeClient: this.litNodeClient,
        });
        this.litAuthClient.initProvider<WebAuthnProvider>(ProviderType.WebAuthn);
    }

    async registerWithWebAuthn(identifier: string) {
        try {
            if (this.litAuthClient == null) {
                await this.connect();
            }
            const provider = this.litAuthClient!.getProvider(ProviderType.WebAuthn) as WebAuthnProvider;
            // Register new WebAuthn credential
            const options = await provider.register(identifier);
            // Verify registration and mint PKP through relay server
            const txHash = await provider.verifyAndMintPKPThroughRelayer(options);
            const response = await provider.relay.pollRequestUntilTerminalState(txHash);
            if (response.status !== "Succeeded") {
                logError("[LIT_REGISTER_WEBAUTHN] - ERROR_REGISTER_WEBAUTHN", {
                    error: errorToJSON(response.error),
                    identifier,
                });
                throw new LitProtocolError(`Failed to register with WebAuthn: ${response.error ?? ""}`);
            }
            logInfo("[LIT_REGISTER_WEBAUTHN] - FINISH", { identifier });
            return {
                pkpEthAddress: response.pkpEthAddress!,
                pkpPublicKey: response.pkpPublicKey!,
            };
        } catch (error: any) {
            logError("[LIT_REGISTER_WEBAUTHN] - ERROR_REGISTER_WEBAUTHN", { error: error.message, identifier });
            throw new LitProtocolError(`Error signing up [${error?.name ?? ""}]`);
        }
    }
    async encrypt({ messageToEncrypt, pkpPublicKey, pkpEthAddress, capacityDelegationAuthSig }: EncryptInput) {
        try {
            const { sessionSigs, accessControlConditions } = await this.prepareLit(
                pkpPublicKey,
                pkpEthAddress,
                capacityDelegationAuthSig
            );
            const { ciphertext, dataToEncryptHash } = await encryptString(
                {
                    accessControlConditions,
                    sessionSigs,
                    chain: chain,
                    dataToEncrypt: messageToEncrypt,
                },
                this.litNodeClient!
            );

            logInfo("[LIT_ENCRYPT] - FINISH", { pkpPublicKey, pkpEthAddress, capacityDelegationAuthSig });
            return {
                ciphertext,
                dataToEncryptHash,
            };
        } catch (error: any) {
            // We log a general error, as we don't want to accidentally log messageToEncrypt
            logError("[LIT_ENCRYPT] - ERROR_ENCRYPT", { pkpPublicKey, pkpEthAddress, capacityDelegationAuthSig });
            throw new LitProtocolError(`Error encrypting message`);
        }
    }

    async decrypt({
        pkpPublicKey,
        pkpEthAddress,
        cipherText,
        dataToEncryptHash,
        capacityDelegationAuthSig,
    }: DecryptInput) {
        try {
            const { sessionSigs, accessControlConditions } = await this.prepareLit(
                pkpPublicKey,
                pkpEthAddress,
                capacityDelegationAuthSig
            );
            const decryptedString = await decryptToString(
                {
                    accessControlConditions,
                    ciphertext: cipherText,
                    dataToEncryptHash: dataToEncryptHash,
                    sessionSigs,
                    chain: chain,
                },
                this.litNodeClient!
            );

            logInfo("[LIT_DECRYPT] - FINISH", {
                pkpPublicKey,
                pkpEthAddress,
                cipherText,
                dataToEncryptHash,
                capacityDelegationAuthSig,
            });
            return decryptedString;
        } catch (error: any) {
            logError("[LIT_DECRYPT] - ERROR_LIT_DECRYPT", {
                error: error.message,
                pkpPublicKey,
                pkpEthAddress,
                cipherText,
                dataToEncryptHash,
                capacityDelegationAuthSig,
            });
            throw new LitProtocolError(`Error decrypting message [${error?.message ?? ""}]`);
        }
    }

    private async prepareLit(pkpPublicKey: string, pkpEthAddress: string, capacityDelegationAuthSig: AuthSig) {
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
                capacityDelegationAuthSig: capacityDelegationAuthSig,
            },
        });

        const accessControlConditions = [
            {
                contractAddress: "",
                standardContractType: "" as any,
                chain: chain as any,
                method: "",
                parameters: [":userAddress"],
                returnValueTest: {
                    comparator: "=" as any,
                    value: pkpEthAddress,
                },
            },
        ];

        return { sessionSigs, accessControlConditions };
    }
}
