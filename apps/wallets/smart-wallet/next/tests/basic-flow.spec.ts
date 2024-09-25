import { test, expect } from "@playwright/test";

test("Core Flow", async ({ page, context }) => {
    // Temporary hack before we have a setup for testing auth
    await context.addCookies([
        {
            name: "crossmint-session",
            value: "xxx",
            domain: "localhost",
            path: "/",
            httpOnly: false,
            secure: false,
            sameSite: "Lax",
        },
    ]);

    const client = await context.newCDPSession(page);

    // Experimental, Chromium only webauthn testing API :)
    // https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
    // Nice write up: https://www.corbado.com/blog/passkeys-e2e-playwright-testing-webauthn-virtual-authenticator
    await client.send("WebAuthn.enable");

    // With `automaticPresenceSimulation` set to true, both registration
    // and sign in prompts will be completed automatically.
    const result = await client.send("WebAuthn.addVirtualAuthenticator", {
        options: {
            protocol: "ctap2",
            transport: "internal",
            hasResidentKey: true,
            hasUserVerification: true,
            isUserVerified: true,
            automaticPresenceSimulation: true,
        },
    });

    // This changes each session, so each test run. So you must register the passkey and perform
    // transactions within a single test run for things to work as expected. There's ways to
    // get around this using the API linked above that chrome exposes.
    console.log(`Authenticator ID: ${result.authenticatorId}`);

    await page.goto("http://localhost:3000");
    expect(page.getByText("Smart Wallet Demo")).toBeVisible();

    await expect(page.getByText("Waiting for your wallet")).toBeVisible({ timeout: 30000 });

    await expect(page.getByText("Mint NFT")).toBeVisible({ timeout: 60000 });
    await page.getByText("Mint NFT").click();

    await expect(page.getByText("Open in my wallet")).toBeVisible({ timeout: 60000 });
});
