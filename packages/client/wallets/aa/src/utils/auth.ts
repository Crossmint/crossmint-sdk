import { logError } from "@/services/logging";
import { errorToJSON } from "./error";

export const parseToken = (token: any) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace("-", "+").replace("_", "/");
        const jsonPayload =
            typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString();
        return JSON.parse(jsonPayload || "");
    } catch (err) {
        logError("[PARSE_TOKEN] - ERROR", {
            error: errorToJSON(err),
        });
        console.error("Error while parsing token");
        throw err;
    }
};
