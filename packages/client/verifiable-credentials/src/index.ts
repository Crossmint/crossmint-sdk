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
    Nft as VCNFT,
    ChainRPCConfig,
} from "./verifiableCredentialsSDK";

// Verification
export { verifyCredential } from "./verifiableCredentialsSDK";
// Presentation
export {
    getNFTFromLocator,
    ContractMetadataService,
    // getUsersCredentialNfts, // Wrapped
    // CredentialService, // Wrapped
} from "./verifiableCredentialsSDK";

export { getUsersCredentialNfts } from "./presentation/getCredentialNfts";
export { CredentialService } from "./presentation/getCredential";
// Decryption
export { Lit } from "./decryption/lit";
export { WalletAuthService } from "./services/walletAuth";
export { WalletDecrypt, MetamaskWalletDecrypt } from "./decryption/wallet";

// Utils
export {
    isEncryptedVerifiableCredential,
    isCredentialType,
    isVerifiableCredential,
    isVcChain,
    ipfsRetrievalProcedure,
} from "./verifiableCredentialsSDK";
export { crossmintRetrievalProcedure } from "./presentation/getCredential";
export { crossmintAPI } from "./crossmintAPI";
