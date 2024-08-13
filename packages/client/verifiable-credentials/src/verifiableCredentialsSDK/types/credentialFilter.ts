/**
 * CredentialFilter defines the criteria for filtering credentials.
 */
export interface CredentialFilter {
    /**
     * List of issuers to filter by.
     * @example ["did:polygon-amoy:0x1B887669437644aA348c518844660ef8d63bd643"]
     */
    issuers?: string[];

    /**
     * List of accepted credential types.
     * @example ["driving_license", "crossmint:e62564a7-06eb-4f65-b389-eb3b7a4f6f98:userAge"]
     */
    types?: string[];
}
