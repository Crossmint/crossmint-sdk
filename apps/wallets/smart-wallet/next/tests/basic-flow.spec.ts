import { test, expect } from "@playwright/test";

const mockJWT =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6InhtaW50LXNpbmdsZSJ9.eyJpc3MiOiJodHRwczovL2Rldi5jcm9zc21pbnQuY29tIiwiaWF0IjoxNzI3MzA3ODQxLCJleHAiOjE3Mjc5MTI2NDEsInN1YiI6IjdmMWRkNTY0LTNkNGItNDFhNC05ZmZmLWJkMjVhMTY1NDkzNyIsImF1ZCI6IjQ0YjZmMWU5LWQyMTgtNDUxMC1hMDMyLWFkZThiYTA5MzhkYSJ9.R5aRaOEKYzZjWx4G4fhCqrEiMLy52Q5_DjWJGIJPu-RfKSa6Fr-ytPa1EyFACPNP1sR22BEUdwstK7ecw6ygUacOi22lSYWxBHbc288lLgtWe_oVuTSntnLttYc47Um1FXMl27AddmmfH67qy526iKVwexSCM_YhTuQVcnZJZnhh78jubKmmXhkOGuFLPPATeHgA91Udn_aYXCsT4a3AOYvqba8exdOlHyWdpme348-12Ncgd9cym9-ED_GM3jV96hlstQVOhdsLh0nRnfthFB4Nt-95UsRRyUYDsJCoP3-TZnjZhIEkF_L5Yak3FQMAlPMz0PZExLxyDi06kXksZg";

test("Core Flow", async ({ page, context }) => {
    await page.route(
        "http://localhost:3000/api/session/sdk/auth/refresh",
        async (route) =>
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    jwt: mockJWT,
                    refresh: {
                        secret: "7048b6f2-a1f3-4b67-9cbd-99fe10657668",
                        expiresAt: "2044-10-02T23:44:01.640Z",
                    },
                }),
            })
    );

    // await page.route(
    //     "http://localhost:3000/api/2024-06-09/sdk/smart-wallet/config?chain=polygon-amoy",
    //     async (route) => {
    //         await route.fulfill({
    //             status: 200,
    //             body: JSON.stringify({
    //                 entryPointVersion: "v0.7",
    //                 kernelVersion: "0.3.1",
    //                 signers: [],
    //                 userId: "test@xxx.com",
    //             }),
    //         });
    //     }
    // );

    // uncomment this for passkey prompt to appear but then fails to register passkey
    await page.route(
        "http://localhost:3000/api/2024-06-09/sdk/smart-wallet/config?chain=polygon-amoy",
        async (route) =>
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    entryPointVersion: "v0.7",
                    kernelVersion: "0.3.1",
                    signers: [
                        {
                            _id: "66f47da2810627bc868e79c9",
                            abstractWalletId: "66f47da2810627bc868e79c7",
                            signerData: {
                                entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
                                validatorAddress: "0xbA45a2BFb8De3D24cA9D7F1B551E14dFF5d690Fd",
                                pubKeyX:
                                    "37537601465768224816772083048499907235453100162318742105619651072929199027272",
                                pubKeyY:
                                    "13620852463035307367392656222353240495618220331258804188684706558765434591652",
                                authenticatorId: "1GIjPYcUK3h3YEKSj4H6AEGUnYA",
                                authenticatorIdHash:
                                    "0xdae7adeaf1261cb40077c5f8d84348f1c384f314a54de14304ad89a18b35f130",
                                passkeyName: "test@xxx.com",
                                validatorContractVersion: "0.0.2",
                                domain: "localhost",
                                type: "passkeys",
                            },
                            __v: 0,
                        },
                    ],
                    smartContractWalletAddress: "0x0000000000000000000000000000000000000000",
                    userId: "test@xxx.com",
                }),
            })
    );

    await page.route("http://localhost:3000/api/internal/passkeys/register/options", async (route) => {
        await route.fulfill({
            status: 201,
            body: JSON.stringify({
                options: {
                    challenge: "AWOoOnOa3Qj35-w0OqCSgpLh0D0sK-PUR1f9kidXEUc",
                    rp: {
                        name: "localhost",
                        id: "localhost",
                    },
                    user: {
                        id: "9-ytvcAiUlYa-_UmXHeeEA",
                        name: "test@xxx.com",
                        displayName: "test@xxx.com",
                    },
                    pubKeyCredParams: [
                        {
                            alg: -7,
                            type: "public-key",
                        },
                    ],
                    timeout: 60000,
                    attestation: "none",
                    excludeCredentials: [],
                    authenticatorSelection: {
                        residentKey: "required",
                        userVerification: "required",
                        requireResidentKey: true,
                    },
                    extensions: {
                        credProps: true,
                    },
                },
                userId: "f7ecadbdc02252561afbf5265c779e10",
            }),
        });
    });

    await page.route("http://localhost:3000/api/internal/passkeys/register/verify", async (route) => {
        await route.fulfill({
            status: 201,
            body: JSON.stringify({
                fmt: "none",
                counter: 0,
                aaguid: "fbfc3007-154e-4ecc-8c0b-6e020557d7bd",
                credentialID: "iQ9QtdIyXoN1WAdxOAR9foSd24s",
                credentialType: "public-key",
                userVerified: true,
                credentialDeviceType: "multiDevice",
                credentialBackedUp: true,
                origin: "http://localhost:3001",
                rpID: "localhost",
            }),
        });
    });

    await page.route(
        "https://polygon-amoy.g.alchemy.com/v2/-7M6vRDBDknwvMxnqah_jbcieWg0qad9",
        async (route) =>
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: 1,
                    jsonrpc: "2.0",
                    result: "0x0000000000000000000000000000000000000000",
                }),
            })
    );

    await page.route(
        "http://localhost:3000/api/2024-06-09/sdk/smart-wallet",
        async (route) =>
            await route.fulfill({
                status: 201,
                body: JSON.stringify({
                    abstractWalletId: "66f498dd259be7ca05d091fa",
                }),
            })
    );

    // Temporary hack before we have a setup for testing auth
    await context.addCookies([
        {
            name: "crossmint-session",
            value: mockJWT,
            domain: "localhost",
            path: "/",
            httpOnly: false,
            secure: false,
            sameSite: "Lax",
        },
        {
            name: "crossmint-refresh-token",
            value: "281c8014-f4a6-41e0-a37b-de47d7f733b7",
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
            automaticPresenceSimulation: false,
        },
    });

    // This changes each session, so each test run. So you must register the passkey and perform
    // transactions within a single test run for things to work as expected. There's ways to
    // get around this using the API linked above that chrome exposes.
    console.log(`Authenticator ID: ${result.authenticatorId}`);

    async function simulateSuccessfulPasskeyInput(operationTrigger: () => Promise<void>) {
        // initialize event listeners to wait for a successful passkey input event
        const operationCompleted = new Promise<void>((resolve) => {
            client.on("WebAuthn.credentialAdded", () => resolve());
            client.on("WebAuthn.credentialAsserted", () => resolve());
        });

        // set isUserVerified option to true
        // (so that subsequent passkey operations will be successful)
        await client.send("WebAuthn.setUserVerified", {
            authenticatorId: result.authenticatorId,
            isUserVerified: true,
        });

        // set automaticPresenceSimulation option to true
        // (so that the virtual authenticator will respond to the next passkey prompt)
        await client.send("WebAuthn.setAutomaticPresenceSimulation", {
            authenticatorId: result.authenticatorId,
            enabled: true,
        });

        // perform a user action that triggers passkey prompt
        await operationTrigger();

        // wait to receive the event that the passkey was successfully registered or verified
        await operationCompleted;

        // set automaticPresenceSimulation option back to false
        await client.send("WebAuthn.setAutomaticPresenceSimulation", {
            authenticatorId: result.authenticatorId,
            enabled: false,
        });
    }
    await page.goto("http://localhost:3001");
    expect(page.getByText("Smart Wallet Demo")).toBeVisible();

    await expect(page.getByText("Waiting for your wallet")).toBeVisible({ timeout: 30000 });

    await simulateSuccessfulPasskeyInput(async () => {
        await page.getByText("Create wallet").click();
    });

    await expect(page.getByText("Mint NFT")).toBeVisible({ timeout: 60000 });
    // await page.getByText("Mint NFT").click();

    // await expect(page.getByText("Open in my wallet")).toBeVisible({ timeout: 60000 });
});
