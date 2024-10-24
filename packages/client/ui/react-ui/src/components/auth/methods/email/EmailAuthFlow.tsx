import { useState } from "react";
import { EmailOTPInput } from "./EmailOTPInput";
import { EmailSignIn } from "./EmailSignIn";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { OtpEmailPayload } from "@/types/auth";

export function EmailAuthFlow() {
    const { step } = useAuthForm();
    const [otpEmailData, setOtpEmailData] = useState<OtpEmailPayload | null>(null);

    if (step === "otp") {
        return <EmailOTPInput otpEmailData={otpEmailData} setOtpEmailData={setOtpEmailData} />;
    }
    if (step === "initial") {
        return <EmailSignIn setOtpEmailData={setOtpEmailData} />;
    }

    return null;
}
