import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3SignIn } from "./Web3SignIn";
import { Web3Connectors } from "./Web3Connectors";

export function Web3AuthFlow() {
    const { step } = useAuthForm();

    if (step.startsWith("web3")) {
        return <Web3Connectors />;
    }

    if (step === "initial") {
        return <Web3SignIn />;
    }

    return null;
}
