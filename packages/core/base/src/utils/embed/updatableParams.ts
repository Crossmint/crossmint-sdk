import { updatableCryptoParams, updatableFiatParams } from "@/consts";
import {
    CrossmintEmbeddedCheckoutProps,
    UpdatableCryptoParams,
    UpdatableEmbeddedCheckoutParams,
    UpdatableFiatParams,
} from "@/types";

import { isCryptoEmbeddedCheckoutProps } from ".";

export function embeddedCheckoutPropsToUpdatableParamsPayload(
    props: CrossmintEmbeddedCheckoutProps
): UpdatableEmbeddedCheckoutParams {
    let updatableParams: UpdatableEmbeddedCheckoutParams;
    if (isCryptoEmbeddedCheckoutProps(props)) {
        updatableParams = Object.fromEntries<UpdatableCryptoParams>(
            updatableCryptoParams.map((key) => [key, props[key]])
        );
    } else {
        updatableParams = Object.fromEntries<UpdatableFiatParams>(updatableFiatParams.map((key) => [key, props[key]]));
    }
    return updatableParams;
}
