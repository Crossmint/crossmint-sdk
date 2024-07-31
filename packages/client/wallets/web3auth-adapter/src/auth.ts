export const parseToken = (token: any) => {
    try {
        const base64Url = token.split(".")[1];
        const base64 = base64Url.replace("-", "+").replace("_", "/");
        const jsonPayload =
            typeof window !== "undefined" ? window.atob(base64) : Buffer.from(base64, "base64").toString();
        return JSON.parse(jsonPayload || "");
    } catch (err) {
        console.error("Error while parsing token");
        throw err;
    }
};
