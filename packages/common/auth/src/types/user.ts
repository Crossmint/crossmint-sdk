/** @deprecated Farcaster login is deprecated and will be removed in a future release. */
export type FarcasterMetadata = {
    fid: string;
    username: string;
    bio: string;
    displayName: string;
    pfpUrl: string;
    custody: string;
    verifications: string[];
};

export type TwitterMetadata = {
    username: string;
    id: string;
};

export type SDKExternalUser = {
    id: string;
    email?: string;
    phoneNumber?: string;
    /** @deprecated Farcaster login is deprecated and will be removed in a future release. */
    farcaster?: FarcasterMetadata;
    twitter?: TwitterMetadata;
};
