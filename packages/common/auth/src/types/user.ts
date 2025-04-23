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
};

export type SDKExternalUser = {
    id: string;
    email?: string;
    phoneNumber?: string;
    farcaster?: FarcasterMetadata;
    twitter?: TwitterMetadata;
};
