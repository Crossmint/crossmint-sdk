// Types
export type {
    VerifiableCredential,
    VerifiableCredentialType, // VerifiableCredential | EncryptedVerifiableCredential
    EncryptedVerifiableCredential,
    VCChain,
    CredentialFilter,
    CredentialsCollection,
    Collection,
    CredentialMetadata,
    VerifiableCredentialEncryption,
    VerifiableCredentialEncryptionType,
    VCNFT,
    ChainRPCConfig,
} from "./verifiableCredentialsSKD";

// Verification
export { verifyCredential } from "./verifiableCredentialsSKD";
// Presentation
export {
    getNFTFromLocator,
    ContractMetadataService,
    // getUsersCredentialNfts, // Wrapped
    // CredentialService, // Wrapped
} from "./verifiableCredentialsSKD";

export { getUsersCredentialNfts } from "./presentation/getCredentialNfts";
export { CredentialService } from "./presentation/getCredential";
// Decryption
export { Lit } from "./services/lit";

// Utils
export {
    isEncryptedVerifiableCredential,
    isCredentialType,
    isVerifiableCredential,
    isVcChain,
} from "./verifiableCredentialsSKD";
export { crossmintAPI } from "./crossmintAPI";
