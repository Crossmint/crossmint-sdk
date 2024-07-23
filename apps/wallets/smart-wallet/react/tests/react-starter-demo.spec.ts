import { Page, expect, test } from "@playwright/test";

// import { authFile } from "../playwright.config";

const baseURL = process.env.REACT_APP_BASE_URL ?? "/";

const usePasskeyListenerClient = async (page: Page) => {
    // Initialize Passkeys stuff (CDP session for the current page)
    const client = await page.context().newCDPSession(page);

    // Enable WebAuthn environment in this session
    await client.send("WebAuthn.enable");

    // Attach a virtual authenticator with specific options
    await client.send("WebAuthn.addVirtualAuthenticator", {
        options: {
            protocol: "ctap2",
            transport: "internal",
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true, // todo might need to change to true.
        },
    });

    return client;
};

test.describe("Signing in, creating wallet, and asserting nft works as expected", () => {
    test("login with our pre-authed google account", async ({ page }) => {
        await page.goto(baseURL);

        const client = await usePasskeyListenerClient(page);

        expect(page.getByText("Crossmint AA Wallet Demo"));

        await page.getByText("Try it!").click();

        console.log("waiting for passkey listener");

        const credentialPromise = new Promise((resolve) => {
            client.once("WebAuthn.credentialAdded", (credential) => {
                console.log("Passkey added");
                console.log({ credential });
                resolve(credential); // Resolve the promise with the credential data
            });
        });

        await credentialPromise;
        // wait an additional 5 seconds to make sure the credential is added
        await page.waitForTimeout(5000);
        console.log("waited for a while");

        // wait for popup window to show up loaded
        // await popup.waitForLoadState("domcontentloaded");
        // await popup.waitForLoadState("load");

        // // await popup.waitForSelector("text=Choose an account", { timeout: 5000 });
        // await popup.waitForSelector("text=Sign in to crossmint-aa-dev.firebaseapp.com", { timeout: 5000 });
        // await popup.getByText("crossmint-test").click();
        // await popup.getByText("Continue").click();
        // // Wait for the popup to close

        // await page.waitForEvent("close", { timeout: 100000 });
        // await passkeyListenerSigner(page);
        // expect(popup.isClosed()).toBeTruthy();
    });

    // test("go to passkeys.eu", async ({ page }) => {
    //     await page.goto("https://passkeys.eu");

    //     const client = await usePasskeyListenerClient(page);
    //     await page.waitForSelector("input[name='email']");
    //     const randomNumber = Math.floor(Math.random() * 9999) + 1000;
    //     await page.getByLabel("Email").fill(`test${randomNumber}@gmail.com`);
    //     await page.keyboard.press("Enter");

    //     const credentialPromise = new Promise((resolve) => {
    //         client.once("WebAuthn.credentialAdded", (credential) => {
    //             console.log("Passkey added");
    //             console.log({ credential });
    //             resolve(credential); // Resolve the promise with the credential data
    //         });
    //     });

    //     await credentialPromise;
    //     // wait an additional 5 seconds to make sure the credential is added
    //     await page.waitForTimeout(5000);
    // });
});
