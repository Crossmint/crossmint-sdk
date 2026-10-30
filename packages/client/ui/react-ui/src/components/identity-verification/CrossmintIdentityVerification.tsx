import type { CrossmintIdentityVerificationProps } from "@crossmint/client-sdk-base";
import { CrossmintIdentityVerificationIFrame } from "./CrossmintIdentityVerificationIFrame";

export function CrossmintIdentityVerification(props: CrossmintIdentityVerificationProps) {
    return <CrossmintIdentityVerificationIFrame {...props} />;
}
