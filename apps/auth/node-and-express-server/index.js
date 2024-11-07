import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";
import http from "http";
import dotenv from "dotenv";
dotenv.config();

const crossmint = createCrossmint({
    apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
});
const crossmintAuth = CrossmintAuth.from(crossmint);

const server = http.createServer(async (req, res) => {
    if (req.method === "POST" && req.url === "/refresh") {
        try {
            await crossmintAuth.handleCustomRefresh(req, res);
        } catch (error) {
            console.error("Error refreshing token", error);
        }
        res.end();
        return;
    }

    if (req.method === "POST" && req.url === "/logout") {
        try {
            await crossmintAuth.logout(req, res);
        } catch (error) {
            console.error("Error logging out", error);
        }
        res.end();
        return;
    }

    try {
        const { jwt, refreshToken, userId } = await crossmintAuth.getSession(req, res);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ jwt, refreshToken, userId }));
    } catch (error) {
        console.error(error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: error.message }));
    }
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
