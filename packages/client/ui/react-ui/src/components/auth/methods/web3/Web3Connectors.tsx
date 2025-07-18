import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { AuthFormBackButton } from "../../AuthFormBackButton";
import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";
import { tw } from "@/twind-instance";

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
                <div className={tw("flex flex-col items-center")}>
                    <div className={tw("flex flex-col gap-[10px] w-full")}>
                        <div className={tw("widget-container")}>
                            <DynamicEmbeddedWidget background="none" />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return null;
}
