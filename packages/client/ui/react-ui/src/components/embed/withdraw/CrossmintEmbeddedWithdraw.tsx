import { EmbeddedWithdrawIFrame } from "./EmbeddedWithdrawIFrame";
import type { CrossmintEmbeddedWithdrawProps } from "@crossmint/client-sdk-base";

export function CrossmintEmbeddedWithdraw(props: CrossmintEmbeddedWithdrawProps) {
    return <EmbeddedWithdrawIFrame {...props} />;
}
