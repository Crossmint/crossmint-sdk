import type { AgenticVerificationOptions } from "@basis-theory/web-agentic";
import type { VerificationAppearance } from "@crossmint/client-sdk-base";

type AgenticAppearance = NonNullable<AgenticVerificationOptions["appearance"]>;

export function mapVerificationAppearanceToAgenticAppearance(
    appearance?: VerificationAppearance
): AgenticAppearance | undefined {
    if (appearance == null) {
        return undefined;
    }

    const colors = appearance.variables?.colors;
    const agenticAppearance = {
        primaryColor: appearance.rules?.PrimaryButton?.colors?.background ?? colors?.accent,
        secondaryColor: appearance.rules?.Input?.colors?.background ?? colors?.backgroundSecondary,
        backgroundColor: colors?.backgroundPrimary,
        fontColor: colors?.textPrimary,
        successColor: colors?.success,
        errorColor: colors?.danger,
    };

    if (Object.values(agenticAppearance).every((value) => value == null)) {
        return undefined;
    }
    return agenticAppearance;
}
