import { createCrossmint, CrossmintAuth } from "@crossmint/server-sdk";
import express from "express";
import dotenv from "dotenv";
dotenv.config();

const app = express();

// Create instances once
const crossmint = createCrossmint({
    apiKey: process.env.SERVER_CROSSMINT_API_KEY || "",
});
const crossmintAuth = CrossmintAuth.from(crossmint);

app.use(express.json());

app.post("/refresh", async (req, res) => {
    try {
        await crossmintAuth.handleCustomRefresh(req, res);
    } catch (error) {
        console.error("Error refreshing token", error);
    }
    res.end();
});

app.post("/logout", async (req, res) => {
    try {
        await crossmintAuth.logout(req, res);
    } catch (error) {
        console.error("Error logging out", error);
    }
    res.end();
});

const authMiddleware = async (req, res, next) => {
    if (req.method !== "GET") {
        next();
        return;
    }

    try {
        const { jwt, userId } = await crossmintAuth.getSession(req, res);
        req.user = { userId, jwt };
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: "Authentication failed" });
    }
};

app.use(authMiddleware);

app.get("/protected", (req, res) => {
    res.json({ message: "Protected route", userId: req.user.userId });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
