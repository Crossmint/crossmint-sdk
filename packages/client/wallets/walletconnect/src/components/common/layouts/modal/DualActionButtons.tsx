import Loader from "@/components/common/Loader";
import { classNames } from "@/utils/classNames";

import { useCrossmintWalletConnect } from "../../../../hooks/useCrossmintWalletConnect";

type ButtonProps = {
    text: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
};

export type DualActionButtonsProps = {
    className?: string;
    left: ButtonProps;
    right: ButtonProps;
};

export default function DualActionButtons({ className, left, right }: DualActionButtonsProps) {
    const { uiConfig } = useCrossmintWalletConnect();

    const commonClasses =
        "flex whitespace-nowrap items-center justify-center text-center h-10 w-full hover:opacity-60 disabled:opacity-50 transition-opacity duration-200 rounded-md shadow-sm tracking-tight";

    return (
        <div className={classNames("flex items-center w-full gap-x-3", className)}>
            <button
                className={classNames(commonClasses, left.className)}
                style={{
                    border: `1px solid ${uiConfig.colors.border}`,
                    color: uiConfig.colors.textSecondary,
                }}
                disabled={left.disabled}
                onClick={left.onClick}
            >
                {left.loading ? <Loader size={4} color={uiConfig.colors.textSecondary} /> : left.text}
            </button>
            <button
                className={classNames(commonClasses, right.className)}
                style={{
                    backgroundColor: uiConfig.colors.accent,
                    color: uiConfig.colors.textAccentButton,
                }}
                disabled={right.disabled}
                onClick={right.onClick}
            >
                {right.loading ? <Loader size={4} color={uiConfig.colors.textAccentButton} /> : right.text}
            </button>
        </div>
    );
}
