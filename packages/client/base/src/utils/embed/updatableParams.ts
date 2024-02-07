import { updatableCryptoParams, updatableFiatParams } from "@/consts";
import {
    CrossmintEmbeddedCheckoutProps,
    CryptoEmbeddedCheckoutPropsWithSigner,
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
            updatableCryptoParams.map((key) => {
                const value = props[key];

                if (key === "signer" && value != null) {
                    return [key, { address: (value as CryptoEmbeddedCheckoutPropsWithSigner["signer"]).address, network: (value as any).network }];
                }

                return [key, value];
            })
        );
    } else {
        updatableParams = Object.fromEntries<UpdatableFiatParams>(updatableFiatParams.map((key) => [key, props[key]]));
    }
    return updatableParams;
}
