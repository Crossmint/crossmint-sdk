import MailosaurClient from "mailosaur";
import { AUTH_CONFIG } from "../config/constants";

const mailosaur = new MailosaurClient(AUTH_CONFIG.mailosaurApiKey);

export async function clearEmailsForAddress(_email: string): Promise<void> {
    try {
        await mailosaur.messages.deleteAll(AUTH_CONFIG.mailosaurServerId);
        console.log(`🗑️ Cleared existing emails for clean test`);
    } catch (error) {
        console.warn("⚠️ Could not clear existing emails:", error);
    }
}

export async function getEmailOTPCode(email: string, expectedType?: "login" | "signer"): Promise<string> {
    try {
        const sentFrom = expectedType === "login" ? "login@auth.crossmint.io" : "hello@crossmint.io";
        const message = await mailosaur.messages.get(
            AUTH_CONFIG.mailosaurServerId,
            {
                sentTo: email,
                sentFrom,
            },
            {
                timeout: AUTH_CONFIG.emailTimeout,
            }
        );

        let otpCode: string | undefined;
        const codes = message.text?.codes || [];

        if (codes.length > 0) {
            if (expectedType === "login") {
                otpCode = codes.find((code) => code.value?.length === 6)?.value;
            } else if (expectedType === "signer") {
                otpCode = codes.find((code) => code.value?.length === 9)?.value;
            }
        }
        if (otpCode == null) {
            throw new Error(`Could not find OTP code in email for ${email}; looking for ${expectedType} OTP code`);
        }

        console.log(`📬 Email received from: ${message.from?.[0]?.email}`);
        console.log(`📋 Email subject: ${message.subject}`);
        console.log(`📋 OTP Code: ${otpCode}`);

        return otpCode;
    } catch (error) {
        console.error("❌ Failed to retrieve OTP from email:", error);
        throw error;
    }
}

export async function getPhoneOTPCode(): Promise<string> {
    try {
        const message = await mailosaur.messages.get(
            AUTH_CONFIG.mailosaurServerId,
            {
                sentTo: AUTH_CONFIG.mailosaurPhoneNumber,
            },
            {
                timeout: AUTH_CONFIG.emailTimeout,
            }
        );

        let otpCode: string | undefined;
        const codes = message.text?.codes || [];

        if (codes.length > 0) {
            otpCode = codes.find((code) => code.value?.length === 9)?.value;
        }
        if (otpCode == null) {
            throw new Error(`Could not find OTP code in sms for ${AUTH_CONFIG.mailosaurPhoneNumber}`);
        }

        console.log(`📬 SMS received from: ${message.from?.[0]?.phone}`);
        console.log(`📋 SMS subject: ${message.subject}`);
        console.log(`📋 OTP Code: ${otpCode}`);

        return otpCode;
    } catch (error) {
        console.error("❌ Failed to retrieve OTP from email:", error);
        throw error;
    }
}
