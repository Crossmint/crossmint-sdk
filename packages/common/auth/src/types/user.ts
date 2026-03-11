export type TwitterMetadata = {
    username: string;
    id: string;
};

export type SDKExternalUser = {
    id: string;
    email?: string;
    phoneNumber?: string;
    twitter?: TwitterMetadata;
};
