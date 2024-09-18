import {
    type FiatEmbeddedCheckoutProps,
    crossmintIFrameService,
    embeddedCheckoutPropsToUpdatableParamsPayload,
} from "@crossmint/client-sdk-base";

import useDeepEffect from "../../../hooks/useDeepEffect";
import CrossmintEmbeddedCheckoutIFrame from "../EmbeddedCheckoutIFrame";

export default function FiatEmbeddedCheckoutIFrame(props: FiatEmbeddedCheckoutProps) {
    const { emitInternalEvent } = crossmintIFrameService(props);

    useDeepEffect(() => {
        emitInternalEvent({
            type: "params-update",
            payload: embeddedCheckoutPropsToUpdatableParamsPayload(props),
        });
    }, [props.recipient, props.mintConfig, props.locale, props.currency, props.whPassThroughArgs]);

    return <CrossmintEmbeddedCheckoutIFrame {...props} />;
}
