export class CrossmintAPI {
    private static clientSecret: string;

    public static init(APIKey: string) {
        this.clientSecret = APIKey;
    }

    public static getHeaders() {
        if (!this.clientSecret) {
            throw new Error("Credentials not set");
        }

        return {
            "x-client-secret": this.clientSecret,
            accept: "application/json",
        };
    }
}
