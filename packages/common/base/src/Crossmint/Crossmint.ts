export type CrossmintConfig = {
    apiKey: string;
    jwt?: string;
    overrideBaseUrl?: string;
};

export class Crossmint {
    constructor(public config: CrossmintConfig) {}

    setJwt(jwt: string | undefined) {
        this.config.jwt = jwt;
    }
}
