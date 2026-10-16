import { createCrossmintApiClient } from "@/utils/createCrossmintApiClient";
import { createProtectedInputsApi } from "@crossmint/client-sdk-base";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import { useMemo } from "react";

/**
 * The buyer's protected inputs, as the buyer named by `jwt` (the same token the components
 * take): `list()` and `get(id)` return metadata only, `revoke(id)` deletes the secret so
 * Universal Checkout can no longer use it. Creation goes through `CrossmintProtectedInput`.
 * @experimental
 */
export function useProtectedInputs(jwt: string) {
    const { crossmint } = useCrossmint();
    return useMemo(
        () =>
            createProtectedInputsApi({
                apiClient: createCrossmintApiClient({ ...crossmint, jwt }, { usageOrigin: "client" }),
            }),
        [crossmint, jwt]
    );
}
