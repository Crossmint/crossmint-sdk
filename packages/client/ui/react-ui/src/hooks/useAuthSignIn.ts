import type { UseSignInData } from "@farcaster/auth-kit";

export function useAuthSignIn() {
    return {
        onEmailSignIn,
        onConfirmEmailOtp,
        onFarcasterSignIn,
    };
}

async function onEmailSignIn(email: string, options: { baseUrl: string; apiKey: string }) {
    try {
        const queryParams = new URLSearchParams({ apiKey: options.apiKey });
        const response = await fetch(`${options.baseUrl}api/2024-09-26/session/sdk/auth/otps/send?${queryParams}`, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": options.apiKey,
            },
            credentials: "same-origin",
            cache: "no-cache",
            mode: "cors",
            method: "POST",
            body: JSON.stringify({ email }),
        });

        if (!response?.ok) {
            throw new Error("Failed to send email. Please try again or contact support.");
        }

        return await response.json();
    } catch (err) {
        console.error("Error signing in via email ", err);
        throw new Error("Error signing in via email " + err);
    }
}

async function onConfirmEmailOtp(
    email: string,
    emailId: string,
    token: string,
    options: { baseUrl: string; apiKey: string }
) {
    try {
        const queryParams = new URLSearchParams({
            email,
            signinAuthenticationMethod: "email",
            apiKey: options.apiKey,
            token,
            locale: "en",
            state: emailId,
            callbackUrl: `${options.baseUrl}api/2024-09-26/session/sdk/auth/we-dont-actually-use-this-anymore`,
        });
        const response = await fetch(`${options.baseUrl}api/2024-09-26/session/sdk/auth/authenticate?${queryParams}`, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": options.apiKey,
            },
            credentials: "same-origin",
            cache: "no-cache",
            mode: "cors",
            method: "POST",
        });

        if (!response?.ok) {
            throw new Error("Failed to confirm email otp. Please try again or contact support.");
        }

        const data = await response.json();
        const callbackUrl = new URL(data.callbackUrl);

        // parse the oneTimeSecret from the callbackUrl response
        return callbackUrl.searchParams.get("oneTimeSecret");
    } catch (err) {
        console.error("Error confirming email otp ", err);
        throw new Error("Error confirming email otp " + err);
    }
}

async function onFarcasterSignIn(data: UseSignInData, options: { baseUrl: string; apiKey: string }) {
    try {
        const queryParams = new URLSearchParams({
            signinAuthenticationMethod: "farcaster",
            apiKey: options.apiKey,
            callbackUrl: `${options.baseUrl}sdk/2024-09-26/auth/callback?isPopup=false`,
        });

        const response = await fetch(`${options.baseUrl}api/2024-09-26/session/sdk/auth/authenticate?${queryParams}`, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": options.apiKey,
            },
            body: JSON.stringify({
                ...data,
                domain: data.signatureParams.domain,
                redirect: true,
                callbackUrl: `${options.baseUrl}sdk/2024-09-26/auth/callback?isPopup=false`,
            }),
            credentials: "same-origin",
            cache: "no-cache",
            mode: "cors",
            method: "POST",
        });

        if (!response?.ok) {
            throw new Error("Failed to sign in via farcaster. Please try again or contact support.");
        }

        const resData = await response.json();
        const callbackUrl = new URL(resData.callbackUrl);

        // parse the oneTimeSecret from the callbackUrl response
        return callbackUrl.searchParams.get("oneTimeSecret");
    } catch (err) {
        console.error("Error signing in via farcaster ", err);
        throw new Error("Error signing in via farcaster " + err);
    }
}
