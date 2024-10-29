import { useAuthForm } from "@/providers/auth/AuthFormProvider";
import type { UIConfig } from "@crossmint/common-sdk-base";

export function Divider({ appearance, text }: { appearance?: UIConfig; text?: string }) {
    const { step } = useAuthForm();

    if (step !== "initial") {
        return null;
    }

    return (
        <div className="flex items-center justify-center w-full pt-2 pb-3">
            <span className="w-full h-[1px] bg-cm-border" style={{ backgroundColor: appearance?.colors?.border }} />
            {text != null ? (
                <p
                    className="flex-none px-2 text-sm text-cm-text-primary"
                    style={{ color: appearance?.colors?.textSecondary }}
                >
                    {text}
                </p>
            ) : null}
            <span className="w-full h-[1px] bg-cm-border" style={{ backgroundColor: appearance?.colors?.border }} />
        </div>
    );
}
