import { test as setup } from "@playwright/test";
import fs from "fs";
import path from "path";

import { authSessionFile } from "../playwright.config";

// Correctly construct the path to the JSON file
const authSessionFilePath = path.join(__dirname, "..", "playwright", ".auth", "user-session.json");

type AuthUser = {
    cookies: {
        name: string;
        value: string;
        domain: string;
        path: string;
        expires: number;
        httpOnly: boolean;
        secure: boolean;
        sameSite: string;
    }[];
    origins: unknown[];
};

/**
 * Checks if the user is authenticated by reading the session from a file.
 *
 * @returns {Promise<boolean>} - True if the user is authenticated, false otherwise.
 */
const checkIfUserIsAuthenticated = async (): Promise<boolean> => {
    try {
        const authSessionFile = fs.readFileSync(authSessionFilePath, "utf-8");
        const authSessionJSON: AuthUser = JSON.parse(authSessionFile);

        if (!authSessionJSON?.cookies?.length) {
            return false;
        }

        const expiresInMillis = authSessionJSON.cookies[0].expires * 1000;
        return expiresInMillis > Date.now();
    } catch (error) {
        return false;
    }
};

setup("authenticate with google account", async ({ page }) => {
    // check if the user is already authenticated
    const isUserAuthenticated = await checkIfUserIsAuthenticated();
    if (isUserAuthenticated) {
        setup.skip();
    }
    // If the file is not found, we need to authenticate
    await page.goto("https://accounts.google.com/signin");
    await page.getByLabel("Email or phone").fill(process.env.GOOGLE_TEST_EMAIL as string);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Enter your password").fill(process.env.GOOGLE_TEST_PASSWORD as string);
    await page.getByRole("button", { name: "Next" }).click();
    page.getByText("Welcome");

    // End of authentication steps.
    await page.context().storageState({ path: authSessionFile });
});
