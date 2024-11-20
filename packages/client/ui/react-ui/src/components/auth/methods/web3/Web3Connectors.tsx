import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";

export function Web3Connectors() {
    const { appearance, step, setStep } = useAuthForm();

    if (step === "web3") {
        return (
            <>
                <AuthFormBackButton
                    onClick={() => setStep("initial")}
                    iconColor={appearance?.colors?.textPrimary}
                    ringColor={appearance?.colors?.accent}
                />
                <div className="flex flex-col items-center">
                    <div className="flex flex-col gap-[10px] w-full">
                        <div className="widget-container">
                            <DynamicEmbeddedWidget background="none" />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return null;
}
