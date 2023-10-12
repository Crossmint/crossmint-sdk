export class CrossmintAPI {
    private static projectID: string;
    private static clientSecret: string;

    public static setCredentials(projectID: string, clientSecret: string) {
        this.projectID = projectID;
        this.clientSecret = clientSecret;
    }

    public static getHeaders() {
        if (!this.projectID || !this.clientSecret) {
            throw new Error("Credentials not set");
        }

        return {
            "x-project-id": this.projectID,
            "x-client-secret": this.clientSecret,
            accept: "application/json",
        };
    }
}
