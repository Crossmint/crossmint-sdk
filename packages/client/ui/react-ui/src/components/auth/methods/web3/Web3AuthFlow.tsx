import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3AuthFlowButton } from "./Web3AuthFlowButton";
import { Web3Connectors } from "./Web3Connectors";

export function Web3AuthFlow() {
    const { step } = useAuthForm();

    // Show wallet connectors when in any web3 step
    if (step.startsWith("web3")) {
        return <Web3Connectors />;
    }

    // Show initial connect button on first step
    if (step === "initial") {
        return <Web3AuthFlowButton />;
    }

    return null;
}
