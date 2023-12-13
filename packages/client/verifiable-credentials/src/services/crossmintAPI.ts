export class CrossmintAPI {
    private static apiKey: string;

    public static init(apiKey: string) {
        this.apiKey = apiKey;
    }

    public static getHeaders() {
        if (!this.apiKey) {
            throw new Error("Credentials not set");
        }

        return {
            "x-client-secret": this.apiKey,
            accept: "application/json",
        };
    }
}
