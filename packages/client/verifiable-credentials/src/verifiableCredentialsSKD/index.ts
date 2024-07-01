// Types
export type * from "./types";
export type { CredentialRetrievalProcedure } from "./presentation/getCredential";
export type { VCSDKConfig } from "./configs";
export type { LitNetwork } from "./encryption/lit";

// Verification
export { verifyCredential } from "./verification";

// Presentation
export { CredentialService, ipfsRetrievalProcedure } from "./presentation/getCredential";
export { ContractMetadataService } from "./presentation/contractMetadata";
export { getUsersCredentialNfts } from "./presentation/getCollections";
export { getNFTFromLocator } from "./presentation/nftByLocator";

// Decryption
export { Lit } from "./encryption/lit";

// Utils
export * from "./types/utils";
export { IPFSService } from "./services/ipfs";
export { configManager, DEFAULT_CHAIN_RPCS, DEFAULT_IPFS_GATEWAYS } from "./configs";
