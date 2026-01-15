import type { Page } from "@playwright/test";
import { AUTH_CONFIG, getEmailForSigner, type SignerType } from "../config/constants";
import { clearEmailsForAddress, getEmailOTPCode, getPhoneOTPCode } from "./email";

export async function performEmailOTPLogin(page: Page, email: string): Promise<void> {
    try {
        console.log(`🔑 Starting email OTP login for: ${email}`);

        await clearEmailsForAddress(email);

        const loginButton = page.locator('button:has-text("Connect wallet")').first();
        await loginButton.click();

        const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await emailInput.waitFor({ timeout: 10000 });
        await emailInput.fill(email);

        const submitButton = page.locator('button:has-text("Submit"), button[type="submit"]').first();
        await submitButton.click();

        console.log("⏳ Waiting for email confirmation message...");
        await page
            .locator("text=/Check your email|We sent you|verification code|OTP code/i")
            .first()
            .waitFor({ timeout: 60000, state: "visible" });
        console.log("📧 Email OTP sent, waiting for email...");

        const otpCode = await getEmailOTPCode(email, "login");
        console.log(`🔐 Retrieved OTP code: ${otpCode}`);

        const otpInput = page.locator('input[data-input-otp="true"]').first();
        await otpInput.waitFor({ timeout: 10000 });
        await page.waitForTimeout(1000);
        await otpInput.fill(otpCode);

        const response = await page.waitForResponse(
            (response) => {
                const url = response.url();
                return (
                    url.includes("/api/2024-09-26/session/sdk/auth/authenticate") &&
                    url.includes("signinAuthenticationMethod=email")
                );
            },
            { timeout: 10000 }
        );
        if (response.status() >= 400) {
            throw new Error(`Email OTP authentication failed with status ${response.status()}`);
        }

        console.log("✅ Email OTP authentication completed successfully");
    } catch (error) {
        console.error("❌ Email OTP authentication failed:", error);
        throw error;
    }
}

export async function waitForWalletReady(page: Page): Promise<void> {
    try {
        await page.locator(".animate-spin").waitFor({ state: "detached", timeout: AUTH_CONFIG.timeout });
        await page.waitForTimeout(1000);

        console.log("✅ Wallet is ready");
    } catch (error) {
        console.error("❌ Wallet failed to load:", error);
        throw error;
    }
}

async function handleEmailPhoneSignerFlow(page: Page, signerType: SignerType): Promise<void> {
    try {
        console.log("🔐 Checking if signer confirmation is needed...");

        const modal = page.locator("div[role='dialog']").first();
        try {
            await modal.waitFor({ state: "visible", timeout: 10000 });
            console.log("📱 Signer modal detected");
        } catch (_) {
            console.log("✅ No signer modal appeared, confirmation not needed");
            return;
        }

        const sendCodeButton = page.locator('button:has-text("Send code")').first();
        const hasSendCode = await sendCodeButton.isVisible({ timeout: 3000 });
        if (!hasSendCode) {
            console.log("✅ No 'Send code' button, signer already confirmed");
            return;
        }

        console.log("📱 Signer confirmation needed, starting flow...");

        // Clear emails before requesting a new code to avoid getting stale codes
        if (signerType === "email") {
            const email = getEmailForSigner(signerType);
            await clearEmailsForAddress(email);
            console.log("🗑️ Cleared existing emails before requesting new code");
        }

        const beforeSendCodeTime = new Date();

        await sendCodeButton.click();
        console.log("📧 Clicked 'Send code' button");

        // Wait for UI confirmation instead of network response - more reliable and works for both client-side and server-side requests
        console.log("⏳ Waiting for 'Check your email/phone' message...");
        if (signerType === "email") {
            await page.locator("text=/Check your email/i").waitFor({ timeout: 60000 });
        } else if (signerType === "phone") {
            await page.locator("text=/Check your phone/i").first().waitFor({ timeout: 60000 });
        }
        console.log("✅ 'Check your email/phone' message appeared");

        console.log("⏳ Waiting for OTP input field...");
        const otpInput = page.locator("input#otpInput").first();
        await otpInput.waitFor({ timeout: 10000 });
        console.log("📝 OTP input field found");

        let signerConfirmationCode: string | undefined;
        console.log(`📧 Fetching OTP code from ${signerType}...`);
        if (signerType === "email") {
            signerConfirmationCode = await getEmailOTPCode(getEmailForSigner(signerType), "signer", beforeSendCodeTime);
        } else if (signerType === "phone") {
            signerConfirmationCode = await getPhoneOTPCode(beforeSendCodeTime);
        }

        if (signerConfirmationCode == null) {
            throw new Error(`Could not find OTP code for ${signerType}`);
        }

        console.log(`🔐 Retrieved signer OTP code: ${signerConfirmationCode}`);

        await otpInput.fill(signerConfirmationCode);
        console.log("📝 Filled OTP code");

        await page.waitForTimeout(500);

        const submitBtn = page.locator('button[type="submit"]:has-text("Submit"), button:has-text("Confirm")').first();
        const isSubmitVisible = await submitBtn.isVisible({ timeout: 5000 }).catch(() => false);

        if (isSubmitVisible) {
            await submitBtn.click();

            try {
                await page.waitForTimeout(1000);
                const modalStillVisible = await modal.isVisible({ timeout: 2000 }).catch(() => false);
                if (!modalStillVisible) {
                } else {
                    const errorMsg = page.locator("text=/invalid/i, text=/incorrect/i, text=/error/i").first();
                    const hasError = await errorMsg.isVisible({ timeout: 2000 }).catch(() => false);
                    if (hasError) {
                        const errorText = await errorMsg.textContent();
                        throw new Error(`OTP submission failed: ${errorText}`);
                    }
                }
            } catch (e) {
                console.warn("⚠️ Could not verify OTP submission status:", e);
            }
        } else {
            console.log("⚠️ No submit button found - OTP might auto-submit or modal might have closed");
        }

        console.log("✅ Signer confirmation flow completed successfully");
    } catch (error) {
        console.error("❌ Signer confirmation failed:", error);
        throw error;
    }
}

export async function handleSignerConfirmation(page: Page, signerType?: SignerType): Promise<void> {
    if (!signerType) {
        try {
            const url = new URL(page.url());
            signerType = url.searchParams.get("signer") as SignerType;
        } catch (e) {
            console.warn("⚠️ Could not parse URL to get signer type, will try to detect from modal");
        }
    }

    console.log(`🔐 Signer type: ${signerType || "unknown"}`);

    if (signerType === "email" || signerType === "phone") {
        await handleEmailPhoneSignerFlow(page, signerType);
    } else {
        const modal = page.locator("div[role='dialog']").first();
        try {
            await modal.waitFor({ state: "visible", timeout: 5000 });
            // If modal appears but we don't know signer type, try email first (most common)
            console.log("⚠️ Signer type unknown, trying email flow");
            await handleEmailPhoneSignerFlow(page, "email");
        } catch (_) {
            console.log("✅ No signer modal appeared, confirmation not needed");
        }
    }

    return;
}
