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

export async function getEmailOTPCode(
    email: string,
    expectedType?: "login" | "signer",
    receivedAfter?: Date
): Promise<string> {
    try {
        const sentFrom = expectedType === "login" ? "login@auth.crossmint.io" : "hello@crossmint.io";
        const searchCriteria: any = {
            sentTo: email,
        };

        // Only filter by sender if we know it, otherwise try to find any email
        if (sentFrom) {
            searchCriteria.sentFrom = sentFrom;
        }

        // Only look for emails received after the specified time
        if (receivedAfter) {
            searchCriteria.receivedAfter = receivedAfter;
        }

        console.log(`🔍 Searching for email with criteria: ${JSON.stringify(searchCriteria)}`);

        let message;
        try {
            message = await mailosaur.messages.get(AUTH_CONFIG.mailosaurServerId, searchCriteria, {
                timeout: AUTH_CONFIG.emailTimeout,
            });
        } catch (error: any) {
            // If we couldn't find email with sender filter, try without it as fallback
            if (error.errorType === "search_timeout" && sentFrom) {
                console.warn(`⚠️ Could not find email from ${sentFrom}, trying without sender filter...`);
                const fallbackCriteria: any = {
                    sentTo: email,
                };
                if (receivedAfter) {
                    fallbackCriteria.receivedAfter = receivedAfter;
                }
                try {
                    message = await mailosaur.messages.get(AUTH_CONFIG.mailosaurServerId, fallbackCriteria, {
                        timeout: AUTH_CONFIG.emailTimeout,
                    });
                    console.log(`✅ Found email from: ${message.from?.[0]?.email} (different sender than expected)`);
                } catch (fallbackError) {
                    console.error("❌ Could not find email even without sender filter");
                    throw error; // Throw original error
                }
            } else {
                throw error;
            }
        }

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

export async function getPhoneOTPCode(receivedAfter?: Date): Promise<string> {
    try {
        const searchCriteria: any = {
            sentTo: AUTH_CONFIG.mailosaurPhoneNumber,
        };

        // Only look for messages received after the specified time
        if (receivedAfter) {
            searchCriteria.receivedAfter = receivedAfter;
        }

        const message = await mailosaur.messages.get(AUTH_CONFIG.mailosaurServerId, searchCriteria, {
            timeout: AUTH_CONFIG.emailTimeout,
        });

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
