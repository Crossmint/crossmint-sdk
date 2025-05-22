import { Signer } from "./types";

export class ApiKeySigner implements Signer {
    type = "api-key" as const;

    // TODO: figure out if we need this..
    locator() {
        return "api-key";
    }

    async sign(message: string): Promise<string> {
        return "";
    }
}
