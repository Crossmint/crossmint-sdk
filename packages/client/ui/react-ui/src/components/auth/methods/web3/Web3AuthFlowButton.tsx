import { ChevronRightIcon } from "@/icons/chevronRight";
import { WalletIcon } from "@/icons/wallet";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { tw } from "@/twind-instance";
import { classNames } from "@/utils/classNames";

export function Web3AuthFlowButton() {
    const { step, appearance, setStep, setError } = useAuthForm();

    if (step !== "initial") {
        return null;
    }

    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary items-center w-full rounded-xl justify-center",
                "transition-colors duration-200 ease-in-out",
                "hover:bg-cm-hover focus:bg-cm-hover outline-none"
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                borderColor: appearance?.colors?.border,
                backgroundColor: appearance?.colors?.buttonBackground,
            }}
            onClick={() => {
                setStep("web3");
                setError(null);
            }}
        >
            <WalletIcon
                className={tw("h-[21px] w-[21px] absolute left-[20px]")}
                style={{ color: appearance?.colors?.textPrimary }}
            />
            <span className={tw("font-medium")} style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}>
                Continue with a wallet
            </span>
            <ChevronRightIcon
                className={tw("h-[21px] w-[21px] absolute right-[20px]")}
                style={{ color: appearance?.colors?.textSecondary }}
            />
            <span className={tw("sr-only")}>Continue with a wallet</span>
        </button>
    );
}
