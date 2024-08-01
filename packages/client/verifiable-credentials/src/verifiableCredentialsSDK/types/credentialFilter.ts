/**
 *  Credential filter
 *  @param issuers - List of issuers to filter by eg ["did:polygon-amoy:0x1B887669437644aA348c518844660ef8d63bd643"]
 *  @param types - List of types accepted eg ["driving_license", "crossmint:e62564a7-06eb-4f65-b389-eb3b7a4f6f98:userAge"]
 */
export interface CredentialFilter {
    issuers?: string[];
    types?: string[];
}
