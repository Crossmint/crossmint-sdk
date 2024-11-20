import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { Web3AuthFlowButton } from "./Web3AuthFlowButton";
import { Web3Connectors } from "./Web3Connectors";
import { useCrossmint } from "@/hooks";
import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { DynamicWeb3WalletConnect } from "@/providers/auth/web3/DynamicWeb3WalletConnect";

export function Web3AuthFlow() {
    const { crossmint } = useCrossmint();
    const apiClient = createCrossmintApiClient(crossmint, {
        usageOrigin: "client",
    });

    return (
        <DynamicWeb3WalletConnect apiKeyEnvironment={apiClient["parsedAPIKey"].environment}>
            <Web3AuthFlowContent />
        </DynamicWeb3WalletConnect>
    );
}

function Web3AuthFlowContent() {
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
