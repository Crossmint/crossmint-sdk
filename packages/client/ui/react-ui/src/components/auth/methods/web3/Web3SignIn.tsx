import { ChevronRightIcon } from "@/icons/chevronRight";
import { WalletIcon } from "@/icons/wallet";
import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import { classNames } from "@/utils/classNames";

export function Web3SignIn() {
    const { step, appearance, setStep } = useAuthForm();

    if (step !== "initial") {
        return null;
    }

    return (
        <button
            className={classNames(
                "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary border border-cm-border items-center w-full rounded-xl justify-center",
                "transition-all duration-200 ease-in-out", // Add smooth transition
                "focus:outline-none focus:ring-1 focus:ring-opacity-50" // Add focus ring
            )}
            style={{
                borderRadius: appearance?.borderRadius,
                borderColor: appearance?.colors?.border,
                backgroundColor: appearance?.colors?.buttonBackground,
                // @ts-expect-error --tw-ring-color is not recognized by typescript but gets picked up by tailwind
                "--tw-ring-color": appearance?.colors?.accent ?? "#1A73E8",
            }}
            onClick={() => setStep("web3")}
        >
            <WalletIcon
                className="h-[21px] w-[21px] absolute left-[20px]"
                style={{ color: appearance?.colors?.textPrimary }}
            />
            <span className="font-medium" style={{ margin: "0px 32px", color: appearance?.colors?.textPrimary }}>
                Sign in with a wallet
            </span>
            <ChevronRightIcon
                className="h-[21px] w-[21px] absolute right-[20px]"
                style={{ color: appearance?.colors?.textSecondary }}
            />

            {/* For accessibility sake   */}
            <span className="sr-only">Sign in with a crypto wallet</span>
        </button>
    );
}
