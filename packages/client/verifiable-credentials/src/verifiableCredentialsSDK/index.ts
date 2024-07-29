// Types
export type * from "./types";
export type { CredentialRetrievalProcedure } from "./presentation/getCredential";
export type { VCSDKConfig } from "./configs";

// Verification
export { verifyCredential } from "./verification";

// Presentation
export { CredentialService, ipfsRetrievalProcedure } from "./presentation/getCredential";
export { ContractMetadataService } from "./presentation/contractMetadata";
export { getCredentialNfts } from "./presentation/getCollections";
export { getCredentialNFTFromLocator } from "./presentation/nftByLocator";

// Decryption
export { Lit, LitNetwork } from "./encryption/lit";
export { VerifiableCredentialEncryptionType } from "./types";

// Utils
export * from "./types/utils";
export { IPFSService } from "./services/ipfs";
export { configManager, DEFAULT_CHAIN_RPCS, DEFAULT_IPFS_GATEWAYS } from "./configs";
