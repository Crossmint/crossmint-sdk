import { EmailOTPInput } from "./EmailOTPInput";
import { EmailSignIn } from "./EmailSignIn";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";

export function EmailAuthFlow() {
    const { step } = useAuthForm();

    if (step === "otp") {
        return <EmailOTPInput />;
    }
    if (step === "initial") {
        return <EmailSignIn />;
    }

    return null;
}
