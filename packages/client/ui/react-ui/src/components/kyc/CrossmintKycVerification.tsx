import type { CrossmintKycVerificationProps } from "@crossmint/client-sdk-base";
import { CrossmintKycVerificationIFrame } from "./CrossmintKycVerificationIFrame";

export function CrossmintKycVerification(props: CrossmintKycVerificationProps) {
    return <CrossmintKycVerificationIFrame {...props} />;
}
