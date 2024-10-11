import { useAuthDialog } from "@/providers/auth/AuthDialogProvider";
import type { UIConfig } from "@crossmint/common-sdk-base";

export function Divider({ appearance, text }: { appearance?: UIConfig; text?: string }) {
    const { step } = useAuthDialog();

    if (step !== "initial") {
        return null;
    }

    return (
        <div className="flex items-center justify-center w-full pt-1 pb-2">
            <span className="w-full h-[1px] bg-[#E7E9ED]" style={{ backgroundColor: appearance?.colors?.border }} />
            {text != null ? (
                <p className="flex-none px-2 text-sm text-[#00150D]" style={{ color: appearance?.colors?.textPrimary }}>
                    {text}
                </p>
            ) : null}
            <span className="w-full h-[1px] bg-[#E7E9ED]" style={{ backgroundColor: appearance?.colors?.border }} />
        </div>
    );
}
