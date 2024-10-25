import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3SignIn } from "./Web3SignIn";
import { Web3Providers } from "./Web3Providers";

export function Web3AuthFlow() {
    const { step } = useAuthForm();

    if (step === "web3") {
        return <Web3Providers />;
    }
    if (step === "initial") {
        return <Web3SignIn />;
    }

    return null;
}
