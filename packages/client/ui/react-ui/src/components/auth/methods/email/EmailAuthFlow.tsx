import { EmailOTPInput } from "./EmailOTPInput";
import { EmailSignIn } from "./EmailSignIn";
import { useAuthDialog } from "@/providers/auth/AuthDialogProvider";

export function EmailAuthFlow() {
    const { step } = useAuthDialog();

    if (step === "otp") {
        return <EmailOTPInput />;
    }
    if (step === "initial") {
        return <EmailSignIn />;
    }

    return null;
}
