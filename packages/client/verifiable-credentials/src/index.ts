// Verification
export type {
    VerifiableCredential,
    VerifiableCredentialType,
    EncryptedVerifiableCredential,
} from "./types/verifiableCredential";
export { isEncryptedVerifiableCredential } from "./services/utils";
export { verifyCredential } from "./verification/verify";
// Presentation
export { getCredentialCollections } from "./presentation/getCollections";
export { MetadataService } from "./presentation/getMetadata";
export { CrossmintAPI } from "./services/crossmintAPI";
export { getCredentialFromId } from "./presentation/getCredential";
export { getNFTFromLocator } from "./presentation/getNftCredential";
// Decryption
export { Lit } from "./services/litInterface";
