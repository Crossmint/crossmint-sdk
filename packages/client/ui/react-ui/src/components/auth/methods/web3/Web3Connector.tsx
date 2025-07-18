import type { UIConfig } from "@crossmint/common-sdk-base";
import { SecuredByCrossmint } from "@/components/common/SecuredByCrossmint";
import { classNames } from "@/utils/classNames";
import { tw } from "@/twind-instance";

export function Web3Connector({
    icon,
    appearance,
    isLoading,
    onConnectClick,
    headingText,
    buttonText,
}: {
    icon: string;
    appearance?: UIConfig;
    isLoading: boolean;
    onConnectClick: () => void;
    headingText: string;
    buttonText: string;
}) {
    return (
        <>
            <div className={tw("flex flex-col items-center text-center mt-8 mb-4 gap-2")}>
                <img src={icon} alt={"metamask"} className={tw("h-[74px] w-[74px]")} />
                <h3
                    className={tw("text-lg font-semibold text-cm-text-primary")}
                    style={{ color: appearance?.colors?.textPrimary }}
                >
                    {headingText}
                </h3>
                <p
                    className={tw("text-base font-normal text-cm-text-primary")}
                    style={{ color: appearance?.colors?.textPrimary }}
                >
                    Don’t see your wallet? Check your other browser windows.
                </p>
            </div>

            <button
                className={classNames(
                    "relative flex text-base p-4 bg-cm-muted-primary text-cm-text-primary items-center w-full rounded-xl justify-center",
                    "transition-colors duration-200 ease-in-out",
                    "hover:bg-cm-hover focus:bg-cm-hover outline-none",
                    isLoading ? "cursor-not-allowed bg-cm-muted-primary" : ""
                )}
                style={{
                    borderRadius: appearance?.borderRadius,
                    borderColor: appearance?.colors?.border,
                    backgroundColor: appearance?.colors?.buttonBackground,
                }}
                onClick={isLoading ? undefined : onConnectClick}
            >
                <span className={tw("font-medium")} style={{ color: appearance?.colors?.textPrimary }}>
                    {buttonText}
                </span>
            </button>

            <div className={tw("flex justify-center pt-4")}>
                <SecuredByCrossmint color={appearance?.colors?.textSecondary} />
            </div>
        </>
    );
}
